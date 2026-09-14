package ro.bid4.backend.shipping.service;

public interface CourierGateway {
  AwbIssued issue(Shipment shipment);

  LabelDocument label(String awb);

  String name();
}
