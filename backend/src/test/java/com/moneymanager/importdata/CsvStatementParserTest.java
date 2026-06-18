package com.moneymanager.importdata;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class CsvStatementParserTest {

    private final CsvStatementParser parser = new CsvStatementParser();

    @Test
    void parsesQuotedCsvRows() {
        ParsedStatement statement = parser.parse("""
                Date,Narration,Debit,Credit,Reference
                12/06/2026,"UPI-SWIGGY, ORDER",650.00,,UTR1
                """.getBytes(StandardCharsets.UTF_8));

        assertThat(statement.headers()).containsExactly("Date", "Narration", "Debit", "Credit", "Reference");
        assertThat(statement.rows()).hasSize(1);
        assertThat(statement.rows().getFirst().get("Narration")).isEqualTo("UPI-SWIGGY, ORDER");
    }
}
