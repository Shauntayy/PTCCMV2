package com.ptccm.backend.controller;

import com.ptccm.backend.domain.CollectionUpsertCommand;
import com.ptccm.backend.service.DataApiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class DataApiControllerTest {

    @Mock
    private DataApiService service;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new DataApiController(service))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void collectionReturnsItemsForUserHeader() throws Exception {
        when(service.getCollection("user-1")).thenReturn(List.of(Map.of(
                "id", "collection-1",
                "quantity", 2
        )));

        mockMvc.perform(get("/api/collection").header("X-User-Id", "user-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("collection-1"))
                .andExpect(jsonPath("$[0].quantity").value(2));
    }

    @Test
    void upsertCollectionMapsRequestBodyIntoCommand() throws Exception {
        // Confirms transport-layer JSON is translated into the service command object.
        when(service.upsertCollectionItem(org.mockito.ArgumentMatchers.eq("user-1"), org.mockito.ArgumentMatchers.any()))
                .thenReturn(Map.of("id", "collection-1"));

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("seriesId", "__new__");
        request.put("newSeriesName", "Pokemon");
        request.put("setId", "__new__");
        request.put("newSetName", "151");
        request.put("newSetTotalCards", 165);
        request.put("cardName", "Charizard ex");
        request.put("cardNumber", "006/165");
        request.put("cardType", "Pokemon");
        request.put("rarity", "Ultra Rare");
        request.put("quantity", 2);
        request.put("estimatedValue", BigDecimal.valueOf(19.99));
        request.put("condition", "Near Mint");
        request.put("duplicateAction", "for_trade");
        request.put("notes", "Fresh pull");

        String payload = """
                {
                  "seriesId": "__new__",
                  "newSeriesName": "Pokemon",
                  "setId": "__new__",
                  "newSetName": "151",
                  "newSetTotalCards": 165,
                  "cardName": "Charizard ex",
                  "cardNumber": "006/165",
                  "cardType": "Pokemon",
                  "rarity": "Ultra Rare",
                  "quantity": 2,
                  "estimatedValue": 19.99,
                  "condition": "Near Mint",
                  "duplicateAction": "for_trade",
                  "notes": "Fresh pull"
                }
                """;

        mockMvc.perform(post("/api/collection/upsert")
                        .header("X-User-Id", "user-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("collection-1"));

        ArgumentCaptor<CollectionUpsertCommand> captor = ArgumentCaptor.forClass(CollectionUpsertCommand.class);
        verify(service).upsertCollectionItem(org.mockito.ArgumentMatchers.eq("user-1"), captor.capture());
        assertThat(captor.getValue().newSeriesName()).isEqualTo("Pokemon");
        assertThat(captor.getValue().newSetName()).isEqualTo("151");
        assertThat(captor.getValue().cardName()).isEqualTo("Charizard ex");
    }

    @Test
    void updateTradeStatusReturnsNoContent() throws Exception {
        mockMvc.perform(patch("/api/trades/trade-1/status")
                        .header("X-User-Id", "user-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"completed\"}"))
                .andExpect(status().isNoContent());

        verify(service).updateTradeStatus("user-1", "trade-1", "completed");
    }

    @Test
    void illegalArgumentExceptionIsReturnedAsBadRequestJson() throws Exception {
        when(service.getCollection("user-1")).thenThrow(new IllegalArgumentException("Bad request"));

        mockMvc.perform(get("/api/collection").header("X-User-Id", "user-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad request"));
    }
}
