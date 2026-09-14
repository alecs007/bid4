package ro.bid4.backend.shipping.service;

public record LabelDocument(String contentType, String filename, byte[] bytes) {}
