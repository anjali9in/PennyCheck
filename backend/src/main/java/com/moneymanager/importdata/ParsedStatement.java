package com.moneymanager.importdata;

import java.util.List;
import java.util.Map;

public record ParsedStatement(
        List<String> headers,
        List<Map<String, String>> rows
) {
}
