package com.moneymanager.exportdata;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class ExportService {

    private static final String[] HEADERS = {
            "Date", "Account", "Category", "Type", "Direction", "Amount", "Currency", "Merchant", "Reference", "Notes"
    };

    private final ExportRepository exportRepository;

    public ExportService(ExportRepository exportRepository) {
        this.exportRepository = exportRepository;
    }

    public ExportResponse transactions(UUID userId, ExportFormat format) {
        List<ExportTransactionRow> rows = exportRepository.transactions(userId);
        return switch (format) {
            case CSV -> build("transactions.csv", "text/csv", csv(rows));
            case XLSX -> build("transactions.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsx(rows));
            case PDF -> build("transactions.pdf", "application/pdf", pdf(rows));
        };
    }

    private ExportResponse build(String fileName, String contentType, byte[] bytes) {
        return new ExportResponse(fileName, contentType, Base64.getEncoder().encodeToString(bytes));
    }

    private byte[] csv(List<ExportTransactionRow> rows) {
        StringBuilder builder = new StringBuilder(String.join(",", HEADERS)).append('\n');
        for (ExportTransactionRow row : rows) {
            builder.append(csv(row.occurredAt().toString())).append(',')
                    .append(csv(row.accountName())).append(',')
                    .append(csv(row.categoryName())).append(',')
                    .append(csv(row.type())).append(',')
                    .append(csv(row.direction())).append(',')
                    .append(row.amount()).append(',')
                    .append(csv(row.currency())).append(',')
                    .append(csv(row.merchant())).append(',')
                    .append(csv(row.referenceNumber())).append(',')
                    .append(csv(row.notes())).append('\n');
        }
        return builder.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] xlsx(List<ExportTransactionRow> rows) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Transactions");
            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                header.createCell(i).setCellValue(HEADERS[i]);
            }
            for (int i = 0; i < rows.size(); i++) {
                ExportTransactionRow item = rows.get(i);
                Row row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue(item.occurredAt().toString());
                row.createCell(1).setCellValue(nullToBlank(item.accountName()));
                row.createCell(2).setCellValue(nullToBlank(item.categoryName()));
                row.createCell(3).setCellValue(item.type());
                row.createCell(4).setCellValue(item.direction());
                row.createCell(5).setCellValue(item.amount().doubleValue());
                row.createCell(6).setCellValue(item.currency());
                row.createCell(7).setCellValue(nullToBlank(item.merchant()));
                row.createCell(8).setCellValue(nullToBlank(item.referenceNumber()));
                row.createCell(9).setCellValue(nullToBlank(item.notes()));
            }
            for (int i = 0; i < HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
            }
            workbook.write(output);
            return output.toByteArray();
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to generate XLSX export", exception);
        }
    }

    private byte[] pdf(List<ExportTransactionRow> rows) {
        StringBuilder content = new StringBuilder("BT /F1 11 Tf 50 780 Td (PennyCheck transactions export ")
                .append(LocalDate.now())
                .append(") Tj 0 -18 Td ");
        int count = 0;
        for (ExportTransactionRow row : rows) {
            if (count++ >= 32) {
                break;
            }
            content.append('(')
                    .append(pdfText(row.occurredAt().toString()))
                    .append("  ")
                    .append(pdfText(nullToBlank(row.accountName())))
                    .append("  ")
                    .append(pdfText(row.direction()))
                    .append("  ")
                    .append(row.amount())
                    .append(") Tj 0 -14 Td ");
        }
        content.append("ET");
        byte[] stream = content.toString().getBytes(StandardCharsets.US_ASCII);
        String pdf = """
                %PDF-1.4
                1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
                2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
                3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
                4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
                5 0 obj << /Length %d >> stream
                %s
                endstream endobj
                xref
                0 6
                0000000000 65535 f
                0000000010 00000 n
                0000000060 00000 n
                0000000117 00000 n
                0000000252 00000 n
                0000000322 00000 n
                trailer << /Root 1 0 R /Size 6 >>
                startxref
                0
                %%EOF
                """.formatted(stream.length, content);
        return pdf.getBytes(StandardCharsets.US_ASCII);
    }

    private String csv(String value) {
        String safe = nullToBlank(value);
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    private String pdfText(String value) {
        return nullToBlank(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }
}
