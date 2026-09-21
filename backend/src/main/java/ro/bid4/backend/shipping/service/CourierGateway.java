package ro.bid4.backend.shipping.service;

import java.util.List;

public interface CourierGateway {
  List<Locker> lockers(String query);

  AwbIssued issue(Shipment shipment);

  LabelDocument label(String awb);

  String name();
}
