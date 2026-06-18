package com.moneymanager.importdata;

public interface StatementParser {

    boolean supports(StatementFileType fileType);

    ParsedStatement parse(byte[] content);
}
