package ro.bid4.backend.shipping.service;

public record Locker(
    String id,
    String name,
    String address,
    String city,
    String county,
    int availableCompartments,
    String scheduleNote) {}
