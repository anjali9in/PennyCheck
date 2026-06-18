package com.moneymanager.importdata;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CsvStatementParser implements StatementParser {

    @Override
    public boolean supports(StatementFileType fileType) {
        return fileType == StatementFileType.CSV;
    }

    @Override
    public ParsedStatement parse(byte[] content) {
        List<List<String>> records = parseRecords(new String(content, StandardCharsets.UTF_8));
        if (records.isEmpty()) {
            return new ParsedStatement(List.of(), List.of());
        }
        List<String> headers = records.getFirst().stream().map(String::trim).toList();
        List<Map<String, String>> rows = new ArrayList<>();
        for (int i = 1; i < records.size(); i++) {
            Map<String, String> row = new LinkedHashMap<>();
            List<String> values = records.get(i);
            for (int column = 0; column < headers.size(); column++) {
                row.put(headers.get(column), column < values.size() ? values.get(column).trim() : "");
            }
            rows.add(row);
        }
        return new ParsedStatement(headers, rows);
    }

    private List<List<String>> parseRecords(String content) {
        List<List<String>> records = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < content.length(); i++) {
            char ch = content.charAt(i);
            if (ch == '"') {
                if (quoted && i + 1 < content.length() && content.charAt(i + 1) == '"') {
                    cell.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (ch == ',' && !quoted) {
                row.add(cell.toString());
                cell.setLength(0);
            } else if ((ch == '\n' || ch == '\r') && !quoted) {
                if (ch == '\r' && i + 1 < content.length() && content.charAt(i + 1) == '\n') {
                    i++;
                }
                row.add(cell.toString());
                cell.setLength(0);
                if (!row.stream().allMatch(String::isBlank)) {
                    records.add(row);
                }
                row = new ArrayList<>();
            } else {
                cell.append(ch);
            }
        }
        row.add(cell.toString());
        if (!row.stream().allMatch(String::isBlank)) {
            records.add(row);
        }
        return records;
    }
}
