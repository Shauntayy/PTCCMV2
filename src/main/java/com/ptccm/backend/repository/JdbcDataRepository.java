package com.ptccm.backend.repository;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Repository
public class JdbcDataRepository implements DataRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public JdbcDataRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<Map<String, Object>> findGameSeries() {
        return jdbc.queryForList(
                """
                select id::text as id, name
                from game_series
                order by name
                """,
                new MapSqlParameterSource()
        );
    }

    @Override
    public List<Map<String, Object>> findCardSets() {
        return jdbc.queryForList(
                """
                select
                  cs.id::text as id,
                  cs.game_series_id::text as game_series_id,
                  cs.name as name,
                  cs.total_cards as total_cards,
                  gs.id::text as gs_id,
                  gs.name as gs_name
                from card_sets cs
                join game_series gs on gs.id = cs.game_series_id
                order by cs.name
                """,
                new MapSqlParameterSource()
        );
    }

    @Override
    public List<Map<String, Object>> findCollectionRowsByUser(String userId) {
        return jdbc.queryForList(
                """
                select
                  uc.id::text as id,
                  uc.user_id::text as user_id,
                  uc.card_id::text as card_id,
                  uc.quantity as quantity,
                  uc.estimated_value as estimated_value,
                  uc.condition as condition,
                  uc.duplicate_action as duplicate_action,
                  uc.notes as notes,
                  uc.created_at as created_at,
                  uc.updated_at as updated_at,
                  c.id::text as c_id,
                  c.name as c_name,
                  c.card_number as c_card_number,
                  c.card_type as c_card_type,
                  c.rarity as c_rarity,
                  cs.id::text as cs_id,
                  cs.game_series_id::text as cs_game_series_id,
                  cs.name as cs_name,
                  cs.total_cards as cs_total_cards,
                  gs.id::text as gs_id,
                  gs.name as gs_name
                from user_collection uc
                left join cards c on c.id = uc.card_id
                left join card_sets cs on cs.id = c.card_set_id
                left join game_series gs on gs.id = cs.game_series_id
                where uc.user_id = cast(:userId as uuid)
                order by uc.created_at desc
                """,
                new MapSqlParameterSource().addValue("userId", userId)
        );
    }

    @Override
    public List<Map<String, Object>> findCollectionItemRowByIdAndUser(String itemId, String userId) {
        return jdbc.queryForList(
                """
                select
                  uc.id::text as id,
                  uc.user_id::text as user_id,
                  uc.card_id::text as card_id,
                  uc.quantity as quantity,
                  uc.estimated_value as estimated_value,
                  uc.condition as condition,
                  uc.duplicate_action as duplicate_action,
                  uc.notes as notes,
                  uc.created_at as created_at,
                  uc.updated_at as updated_at,
                  c.id::text as c_id,
                  c.name as c_name,
                  c.card_number as c_card_number,
                  c.card_type as c_card_type,
                  c.rarity as c_rarity,
                  cs.id::text as cs_id,
                  cs.game_series_id::text as cs_game_series_id,
                  cs.name as cs_name,
                  cs.total_cards as cs_total_cards,
                  gs.id::text as gs_id,
                  gs.name as gs_name
                from user_collection uc
                left join cards c on c.id = uc.card_id
                left join card_sets cs on cs.id = c.card_set_id
                left join game_series gs on gs.id = cs.game_series_id
                where uc.id = cast(:id as uuid)
                  and uc.user_id = cast(:userId as uuid)
                limit 1
                """,
                new MapSqlParameterSource().addValue("id", itemId).addValue("userId", userId)
        );
    }

    @Override
    public String upsertSeriesAndReturnId(String seriesName) {
        return jdbc.queryForObject(
                """
                insert into game_series(name)
                values (:name)
                on conflict (name) do update set name = excluded.name
                returning id::text
                """,
                new MapSqlParameterSource().addValue("name", seriesName),
                String.class
        );
    }

    @Override
    public String insertCardSetAndReturnId(String seriesId, String setName, Integer totalCards) {
        return jdbc.queryForObject(
                """
                insert into card_sets(game_series_id, name, total_cards)
                values (cast(:seriesId as uuid), :name, :totalCards)
                returning id::text
                """,
                new MapSqlParameterSource()
                        .addValue("seriesId", seriesId)
                        .addValue("name", setName)
                        .addValue("totalCards", totalCards),
                String.class
        );
    }

    @Override
    public List<String> findCardIdsBySetAndName(String setId, String cardName) {
        return jdbc.query(
                """
                select id::text
                from cards
                where card_set_id = cast(:setId as uuid)
                  and lower(name) = lower(:name)
                limit 1
                """,
                new MapSqlParameterSource()
                        .addValue("setId", setId)
                        .addValue("name", cardName),
                (rs, rowNum) -> rs.getString(1)
        );
    }

    @Override
    public String insertCardAndReturnId(String setId, String cardName, String cardNumber, String cardType, String rarity) {
        return jdbc.queryForObject(
                """
                insert into cards(card_set_id, name, card_number, card_type, rarity)
                values (cast(:setId as uuid), :name, :cardNumber, :cardType, :rarity)
                returning id::text
                """,
                new MapSqlParameterSource()
                        .addValue("setId", setId)
                        .addValue("name", cardName)
                        .addValue("cardNumber", cardNumber)
                        .addValue("cardType", cardType)
                        .addValue("rarity", rarity),
                String.class
        );
    }

    @Override
    public String upsertCollectionAndReturnId(
            String userId,
            String cardId,
            Integer quantity,
            BigDecimal estimatedValue,
            String condition,
            String duplicateAction,
            String notes
    ) {
        return jdbc.queryForObject(
                """
                insert into user_collection(user_id, card_id, quantity, estimated_value, condition, duplicate_action, notes, updated_at)
                values (cast(:userId as uuid), cast(:cardId as uuid), :quantity, :estimatedValue, :condition, :duplicateAction, :notes, now())
                on conflict (user_id, card_id)
                do update set
                  quantity = excluded.quantity,
                  estimated_value = excluded.estimated_value,
                  condition = excluded.condition,
                  duplicate_action = excluded.duplicate_action,
                  notes = excluded.notes,
                  updated_at = now()
                returning id::text
                """,
                new MapSqlParameterSource()
                        .addValue("userId", userId)
                        .addValue("cardId", cardId)
                        .addValue("quantity", quantity)
                        .addValue("estimatedValue", estimatedValue)
                        .addValue("condition", condition)
                        .addValue("duplicateAction", duplicateAction)
                        .addValue("notes", notes),
                String.class
        );
    }

    @Override
    public int updateCollectionItem(
            String userId,
            String itemId,
            Integer quantity,
            BigDecimal estimatedValue,
            String condition,
            String duplicateAction,
            String notes
    ) {
        return jdbc.update(
                """
                update user_collection
                set
                  quantity = :quantity,
                  estimated_value = :estimatedValue,
                  condition = :condition,
                  duplicate_action = :duplicateAction,
                  notes = :notes,
                  updated_at = now()
                where id = cast(:id as uuid)
                  and user_id = cast(:userId as uuid)
                """,
                new MapSqlParameterSource()
                        .addValue("id", itemId)
                        .addValue("userId", userId)
                        .addValue("quantity", quantity)
                        .addValue("estimatedValue", estimatedValue)
                        .addValue("condition", condition)
                        .addValue("duplicateAction", duplicateAction)
                        .addValue("notes", notes)
        );
    }

    @Override
    public int deleteCollectionItem(String userId, String itemId) {
        return jdbc.update(
                """
                delete from user_collection
                where id = cast(:id as uuid)
                  and user_id = cast(:userId as uuid)
                """,
                new MapSqlParameterSource().addValue("id", itemId).addValue("userId", userId)
        );
    }

    @Override
    public String findCardIdByCollectionItem(String userId, String itemId) {
        List<String> results = jdbc.query(
                """
                select card_id::text
                from user_collection
                where id = cast(:id as uuid)
                  and user_id = cast(:userId as uuid)
                """,
                new MapSqlParameterSource().addValue("id", itemId).addValue("userId", userId),
                (rs, rowNum) -> rs.getString(1)
        );
        return results.isEmpty() ? null : results.get(0);
    }

    @Override
    public int countCardOwners(String cardId) {
        Integer count = jdbc.queryForObject(
                """
                select count(distinct user_id)
                from user_collection
                where card_id = cast(:cardId as uuid)
                """,
                new MapSqlParameterSource().addValue("cardId", cardId),
                Integer.class
        );
        return count == null ? 0 : count;
    }

    @Override
    public void deleteCard(String cardId) {
        jdbc.update(
                """
                delete from cards
                where id = cast(:cardId as uuid)
                """,
                new MapSqlParameterSource().addValue("cardId", cardId)
        );
    }

    @Override
    public int updateDuplicateAction(String userId, String itemId, String duplicateAction) {
        return jdbc.update(
                """
                update user_collection
                set duplicate_action = :duplicateAction,
                    updated_at = now()
                where id = cast(:id as uuid)
                  and user_id = cast(:userId as uuid)
                """,
                new MapSqlParameterSource()
                        .addValue("id", itemId)
                        .addValue("userId", userId)
                        .addValue("duplicateAction", duplicateAction)
        );
    }

    @Override
    public List<Map<String, Object>> findTradesWithItemsByUser(String userId) {
        return jdbc.queryForList(
                """
                select
                  t.id::text as t_id,
                  t.user_id::text as t_user_id,
                  t.title as t_title,
                  t.trade_partner as t_trade_partner,
                  t.status as t_status,
                  t.notes as t_notes,
                  t.created_at as t_created_at,
                  t.updated_at as t_updated_at,
                  ti.id::text as ti_id,
                  ti.trade_id::text as ti_trade_id,
                  ti.card_id::text as ti_card_id,
                  ti.card_name as ti_card_name,
                  ti.direction as ti_direction,
                  ti.quantity as ti_quantity,
                  ti.estimated_value as ti_estimated_value
                from trades t
                left join trade_items ti on ti.trade_id = t.id
                where t.user_id = cast(:userId as uuid)
                order by t.created_at desc, ti.created_at asc
                """,
                new MapSqlParameterSource().addValue("userId", userId)
        );
    }

    @Override
    public void insertTrade(String userId, String title, String tradePartner, String status, String notes) {
        jdbc.update(
                """
                insert into trades(user_id, title, trade_partner, status, notes)
                values (cast(:userId as uuid), :title, :tradePartner, :status, :notes)
                """,
                new MapSqlParameterSource()
                        .addValue("userId", userId)
                        .addValue("title", title)
                        .addValue("tradePartner", tradePartner)
                        .addValue("status", status)
                        .addValue("notes", notes)
        );
    }

    @Override
    public int updateTrade(String userId, String tradeId, String title, String tradePartner, String status, String notes) {
        return jdbc.update(
                """
                update trades
                set title = :title,
                    trade_partner = :tradePartner,
                    status = :status,
                    notes = :notes,
                    updated_at = now()
                where id = cast(:tradeId as uuid)
                  and user_id = cast(:userId as uuid)
                """,
                new MapSqlParameterSource()
                        .addValue("tradeId", tradeId)
                        .addValue("userId", userId)
                        .addValue("title", title)
                        .addValue("tradePartner", tradePartner)
                        .addValue("status", status)
                        .addValue("notes", notes)
        );
    }

    @Override
    public int deleteTrade(String userId, String tradeId) {
        return jdbc.update(
                """
                delete from trades
                where id = cast(:tradeId as uuid)
                  and user_id = cast(:userId as uuid)
                """,
                new MapSqlParameterSource().addValue("tradeId", tradeId).addValue("userId", userId)
        );
    }

    @Override
    public List<String> findTradeStatus(String userId, String tradeId) {
        return jdbc.query(
                """
                select status
                from trades
                where id = cast(:tradeId as uuid)
                  and user_id = cast(:userId as uuid)
                """,
                new MapSqlParameterSource().addValue("tradeId", tradeId).addValue("userId", userId),
                (rs, rowNum) -> rs.getString(1)
        );
    }

    @Override
    public int updateTradeStatus(String userId, String tradeId, String status) {
        return jdbc.update(
                """
                update trades
                set status = :status,
                    updated_at = now()
                where id = cast(:tradeId as uuid)
                  and user_id = cast(:userId as uuid)
                """,
                new MapSqlParameterSource()
                        .addValue("tradeId", tradeId)
                        .addValue("userId", userId)
                        .addValue("status", status)
        );
    }

    @Override
    public List<Map<String, Object>> findOfferingItemsByTradeId(String tradeId) {
        return jdbc.queryForList(
                """
                select card_id::text as card_id, quantity, estimated_value
                from trade_items
                where trade_id = cast(:tradeId as uuid)
                  and direction = 'offering'
                  and card_id is not null
                """,
                new MapSqlParameterSource().addValue("tradeId", tradeId)
        );
    }

    @Override
    public void decrementCollectionQuantityByCard(String userId, String cardId, Integer quantity) {
        jdbc.update(
                """
                update user_collection
                set quantity = quantity - :qty,
                    updated_at = now()
                where user_id = cast(:userId as uuid)
                  and card_id = cast(:cardId as uuid)
                """,
                new MapSqlParameterSource()
                        .addValue("userId", userId)
                        .addValue("cardId", cardId)
                        .addValue("qty", quantity)
        );
    }

    @Override
    public void deleteCollectionCardsWithNonPositiveQuantity(String userId, String cardId) {
        jdbc.update(
                """
                delete from user_collection
                where user_id = cast(:userId as uuid)
                  and card_id = cast(:cardId as uuid)
                  and quantity <= 0
                """,
                new MapSqlParameterSource().addValue("userId", userId).addValue("cardId", cardId)
        );
    }

    @Override
    public void restoreCollectionCard(String userId, String cardId, Integer quantity, BigDecimal estimatedValue) {
        jdbc.update(
                """
                insert into user_collection(user_id, card_id, quantity, estimated_value, condition, duplicate_action, notes, updated_at)
                values (
                  cast(:userId as uuid),
                  cast(:cardId as uuid),
                  :quantity,
                  :estimatedValue,
                  'Near Mint',
                  'keep',
                  null,
                  now()
                )
                on conflict (user_id, card_id)
                do update set
                  quantity = user_collection.quantity + excluded.quantity,
                  updated_at = now()
                """,
                new MapSqlParameterSource()
                        .addValue("userId", userId)
                        .addValue("cardId", cardId)
                        .addValue("quantity", quantity)
                        .addValue("estimatedValue", estimatedValue)
        );
    }

    @Override
    public int countTradesOwnedByUser(String userId, String tradeId) {
        Integer count = jdbc.queryForObject(
                """
                select count(*)
                from trades
                where id = cast(:tradeId as uuid)
                  and user_id = cast(:userId as uuid)
                """,
                new MapSqlParameterSource().addValue("tradeId", tradeId).addValue("userId", userId),
                Integer.class
        );
        return count == null ? 0 : count;
    }

    @Override
    public void insertTradeItem(
            String tradeId,
            String cardId,
            String cardName,
            String direction,
            Integer quantity,
            BigDecimal estimatedValue
    ) {
        jdbc.update(
                """
                insert into trade_items(trade_id, card_id, card_name, direction, quantity, estimated_value)
                values (
                  cast(:tradeId as uuid),
                  cast(nullif(:cardId, '') as uuid),
                  :cardName,
                  :direction,
                  :quantity,
                  :estimatedValue
                )
                """,
                new MapSqlParameterSource()
                        .addValue("tradeId", tradeId)
                        .addValue("cardId", cardId)
                        .addValue("cardName", cardName)
                        .addValue("direction", direction)
                        .addValue("quantity", quantity)
                        .addValue("estimatedValue", estimatedValue)
        );
    }

    @Override
    public Map<String, Object> findTradeItemDetails(String userId, String tradeId, String itemId) {
        List<Map<String, Object>> results = jdbc.queryForList(
                """
                select ti.card_id::text as card_id, ti.quantity, ti.estimated_value, ti.direction
                from trade_items ti
                where ti.id = cast(:itemId as uuid)
                  and ti.trade_id = cast(:tradeId as uuid)
                  and exists (
                    select 1
                    from trades t
                    where t.id = cast(:tradeId as uuid)
                      and t.user_id = cast(:userId as uuid)
                  )
                """,
                new MapSqlParameterSource()
                        .addValue("itemId", itemId)
                        .addValue("tradeId", tradeId)
                        .addValue("userId", userId)
        );
        return results.isEmpty() ? null : results.get(0);
    }

    @Override
    public int deleteTradeItem(String userId, String tradeId, String itemId) {
        return jdbc.update(
                """
                delete from trade_items
                where id = cast(:itemId as uuid)
                  and trade_id = cast(:tradeId as uuid)
                  and exists (
                    select 1
                    from trades t
                    where t.id = cast(:tradeId as uuid)
                      and t.user_id = cast(:userId as uuid)
                  )
                """,
                new MapSqlParameterSource()
                        .addValue("itemId", itemId)
                        .addValue("tradeId", tradeId)
                        .addValue("userId", userId)
        );
    }
}
