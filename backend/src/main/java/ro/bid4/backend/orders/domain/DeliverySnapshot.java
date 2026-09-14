package ro.bid4.backend.orders.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Getter;
import lombok.Setter;
import ro.bid4.backend.identity.domain.DeliveryMethod;
import ro.bid4.backend.identity.domain.DeliveryMethodType;

@Getter
@Setter
@Embeddable
public class DeliverySnapshot {
  @Enumerated(EnumType.STRING)
  @Column(name = "delivery_type")
  private DeliveryMethodType type;

  @Column(name = "delivery_label")
  private String label;

  @Column(name = "easybox_locker_id")
  private String easyboxLockerId;

  @Column(name = "locker_name")
  private String lockerName;

  @Column(name = "locker_address")
  private String lockerAddress;

  @Column(name = "recipient_name")
  private String recipientName;

  @Column private String street;

  @Column private String city;

  @Column private String county;

  @Column(name = "postal_code")
  private String postalCode;

  @Column(name = "address_details")
  private String addressDetails;

  @Column private String phone;

  public static DeliverySnapshot of(DeliveryMethod method) {
    DeliverySnapshot snapshot = new DeliverySnapshot();
    snapshot.type = method.getType();
    snapshot.label = method.getLabel();
    snapshot.easyboxLockerId = method.getEasyboxLockerId();
    snapshot.lockerName = method.getLockerName();
    snapshot.lockerAddress = method.getLockerAddress();
    snapshot.recipientName = method.getRecipientName();
    snapshot.street = method.getStreet();
    snapshot.city = method.getCity();
    snapshot.county = method.getCounty();
    snapshot.postalCode = method.getPostalCode();
    snapshot.addressDetails = method.getAddressDetails();
    snapshot.phone = method.getPhone();
    return snapshot;
  }

  public String shortDescription() {
    if (type == DeliveryMethodType.EASYBOX) {
      return lockerName == null ? "Easybox" : lockerName;
    }
    return city == null ? "Curier la adresă" : "Curier — " + city;
  }
}
