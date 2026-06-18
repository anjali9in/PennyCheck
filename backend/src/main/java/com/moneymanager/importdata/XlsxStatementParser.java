package com.moneymanager.importdata;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

@Component
public class XlsxStatementParser implements StatementParser {

    @Override
    public boolean supports(StatementFileType fileType) {
        return fileType == StatementFileType.XLSX;
    }

    @Override
    public ParsedStatement parse(byte[] content) {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            if (headerRow == null) {
                return new ParsedStatement(List.of(), List.of());
            }
            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                headers.add(formatter.formatCellValue(cell).trim());
            }

            List<Map<String, String>> rows = new ArrayList<>();
            for (int rowIndex = sheet.getFirstRowNum() + 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row sheetRow = sheet.getRow(rowIndex);
                if (sheetRow == null) {
                    continue;
                }
                Map<String, String> row = new LinkedHashMap<>();
                boolean blank = true;
                for (int column = 0; column < headers.size(); column++) {
                    String value = formatter.formatCellValue(sheetRow.getCell(column)).trim();
                    row.put(headers.get(column), value);
                    blank = blank && value.isBlank();
                }
                if (!blank) {
                    rows.add(row);
                }
            }
            return new ParsedStatement(headers, rows);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Unable to parse XLSX statement", exception);
        }
    }
}
