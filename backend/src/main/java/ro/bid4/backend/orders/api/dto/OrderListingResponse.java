package ro.bid4.backend.orders.api.dto;

import java.util.List;
import java.util.UUID;

public record OrderListingResponse(UUID id, String title, List<String> images) {}
