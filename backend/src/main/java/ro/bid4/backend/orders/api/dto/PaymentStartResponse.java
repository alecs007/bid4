package ro.bid4.backend.orders.api.dto;

public record PaymentStartResponse(OrderResponse order, String redirectUrl) {}
