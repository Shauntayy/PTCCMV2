package com.ptccm.backend.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class JdbcDataRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17")
            .withDatabaseName("ptccm_test")
            .withUsername("test")
            .withPassword("test");

    private JdbcTemplate jdbcTemplate;
    private JdbcDataRepository repository;

    @BeforeEach
    void setUp() throws SQLException {
        // Rebuild the schema for each test so repository behavior stays isolated and repeatable.
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                postgres.getJdbcUrl(),
                postgres.getUsername(),
                postgres.getPassword()
        );

        jdbcTemplate = new JdbcTemplate(dataSource);
        repository = new JdbcDataRepository(new NamedParameterJdbcTemplate(dataSource));

        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("postgres/cleanup.sql"));
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("postgres/schema.sql"));
        }
    }

    @Test
    void findCollectionRowsByUserReturnsJoinedCardSetAndSeriesData() {
        String userId = "00000000-0000-0000-0000-000000000001";

        jdbcTemplate.update("insert into game_series(id, name) values (?, ?)", "10000000-0000-0000-0000-000000000001", "Pokemon");
        jdbcTemplate.update("insert into card_sets(id, game_series_id, name, total_cards) values (?, ?, ?, ?)",
                "20000000-0000-0000-0000-000000000001", "10000000-0000-0000-0000-000000000001", "151", 165);
        jdbcTemplate.update("insert into cards(id, card_set_id, name, card_number, card_type, rarity) values (?, ?, ?, ?, ?, ?)",
                "30000000-0000-0000-0000-000000000001", "20000000-0000-0000-0000-000000000001", "Charizard ex", "006/165", "Pokemon", "Ultra Rare");
        jdbcTemplate.update("insert into user_collection(id, user_id, card_id, quantity, estimated_value, condition, duplicate_action, notes) values (?, ?, ?, ?, ?, ?, ?, ?)",
                "40000000-0000-0000-0000-000000000001", userId, "30000000-0000-0000-0000-000000000001", 2, BigDecimal.valueOf(19.99), "Near Mint", "for_trade", "Fresh pull");

        List<Map<String, Object>> rows = repository.findCollectionRowsByUser(userId);

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0))
                .containsEntry("c_name", "Charizard ex")
                .containsEntry("cs_name", "151")
                .containsEntry("gs_name", "Pokemon");
    }

    @Test
    void upsertCollectionAndReturnIdUpdatesExistingRowOnConflict() {
        String userId = "00000000-0000-0000-0000-000000000001";
        String cardId = "30000000-0000-0000-0000-000000000001";
        String collectionId = "40000000-0000-0000-0000-000000000001";

        jdbcTemplate.update("insert into game_series(id, name) values (?, ?)", "10000000-0000-0000-0000-000000000001", "Pokemon");
        jdbcTemplate.update("insert into card_sets(id, game_series_id, name, total_cards) values (?, ?, ?, ?)",
                "20000000-0000-0000-0000-000000000001", "10000000-0000-0000-0000-000000000001", "151", 165);
        jdbcTemplate.update("insert into cards(id, card_set_id, name) values (?, ?, ?)",
                cardId, "20000000-0000-0000-0000-000000000001", "Pikachu");
        jdbcTemplate.update("insert into user_collection(id, user_id, card_id, quantity, estimated_value, condition, duplicate_action, notes) values (?, ?, ?, ?, ?, ?, ?, ?)",
                collectionId, userId, cardId, 1, BigDecimal.ONE, "Near Mint", "keep", "Old");

        String returnedId = repository.upsertCollectionAndReturnId(
                userId,
                cardId,
                3,
                BigDecimal.valueOf(12.50),
                "Lightly Played",
                "for_trade",
                "Updated"
        );

        Map<String, Object> updated = jdbcTemplate.queryForMap(
                "select id::text as id, quantity, estimated_value, condition, duplicate_action, notes from user_collection where id = ?::uuid",
                collectionId
        );

        assertThat(returnedId).isEqualTo(collectionId);
        assertThat(updated)
                .containsEntry("quantity", 3)
                .containsEntry("condition", "Lightly Played")
                .containsEntry("duplicate_action", "for_trade")
                .containsEntry("notes", "Updated");
    }

    @Test
    void restoreCollectionCardAddsQuantityToExistingCollectionRow() {
        String userId = "00000000-0000-0000-0000-000000000001";
        String cardId = "30000000-0000-0000-0000-000000000001";

        jdbcTemplate.update("insert into game_series(id, name) values (?, ?)", "10000000-0000-0000-0000-000000000001", "Pokemon");
        jdbcTemplate.update("insert into card_sets(id, game_series_id, name, total_cards) values (?, ?, ?, ?)",
                "20000000-0000-0000-0000-000000000001", "10000000-0000-0000-0000-000000000001", "151", 165);
        jdbcTemplate.update("insert into cards(id, card_set_id, name) values (?, ?, ?)",
                cardId, "20000000-0000-0000-0000-000000000001", "Bulbasaur");
        jdbcTemplate.update("insert into user_collection(id, user_id, card_id, quantity, estimated_value, condition, duplicate_action) values (?, ?, ?, ?, ?, ?, ?)",
                "40000000-0000-0000-0000-000000000001", userId, cardId, 1, BigDecimal.valueOf(5.00), "Near Mint", "keep");

        repository.restoreCollectionCard(userId, cardId, 2, BigDecimal.valueOf(7.50));

        Integer quantity = jdbcTemplate.queryForObject(
                "select quantity from user_collection where user_id = ?::uuid and card_id = ?::uuid",
                Integer.class,
                userId,
                cardId
        );

        assertThat(quantity).isEqualTo(3);
    }
}
