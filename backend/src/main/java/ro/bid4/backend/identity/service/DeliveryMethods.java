package ro.bid4.backend.identity.service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.api.dto.DeliveryMethodRequest;
import ro.bid4.backend.identity.api.dto.DeliveryMethodResponse;
import ro.bid4.backend.identity.api.dto.HomeAddressPayload;
import ro.bid4.backend.identity.domain.DeliveryMethod;
import ro.bid4.backend.identity.domain.DeliveryMethodType;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.repo.DeliveryMethodRepository;
import ro.bid4.backend.identity.repo.UserAccountRepository;

@Service
public class DeliveryMethods {
  private final DeliveryMethodRepository methods;
  private final UserAccountRepository users;

  public DeliveryMethods(DeliveryMethodRepository methods, UserAccountRepository users) {
    this.methods = methods;
    this.users = users;
  }

  @Transactional(readOnly = true)
  public List<DeliveryMethodResponse> list(Viewer viewer) {
    UUID me = required(viewer);
    return methods.findByUserIdOrderByCreatedAtAsc(me).stream()
        .sorted(Comparator.comparing(DeliveryMethod::isDefault).reversed())
        .map(DeliveryMethods::toResponse)
        .toList();
  }

  @Transactional
  public DeliveryMethodResponse create(DeliveryMethodRequest request, Viewer viewer) {
    UUID me = required(viewer);
    UserAccount account =
        users.findById(me).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHENTICATED));

    DeliveryMethodType type = typeOf(request.type());
    DeliveryMethod method = new DeliveryMethod();
    method.setUserId(me);
    method.setType(type);
    method.setPhone(request.phone().strip());

    if (type == DeliveryMethodType.EASYBOX) {
      if (blank(request.easyboxLockerId()) || blank(request.lockerName())) {
        throw invalid("Alege un locker Easybox.");
      }
      method.setEasyboxLockerId(request.easyboxLockerId().strip());
      method.setLockerName(request.lockerName().strip());
      method.setLockerAddress(trimmed(request.lockerAddress()));
      method.setLabel(blank(request.label()) ? request.lockerName().strip() : request.label());
    } else {
      HomeAddressPayload address = request.homeAddress();
      if (address == null
          || blank(address.recipientName())
          || blank(address.street())
          || blank(address.city())
          || blank(address.county())) {
        throw invalid("Completează numele, strada, localitatea și județul.");
      }
      method.setRecipientName(address.recipientName().strip());
      method.setStreet(address.street().strip());
      method.setCity(address.city().strip());
      method.setCounty(address.county().strip());
      method.setPostalCode(trimmed(address.postalCode()));
      method.setAddressDetails(trimmed(address.details()));
      method.setLabel(blank(request.label()) ? "Acasă" : request.label());
    }

    List<DeliveryMethod> existing = methods.findByUserIdOrderByCreatedAtAsc(me);
    boolean becomesDefault = request.isDefault() || existing.isEmpty();
    if (becomesDefault) {
      existing.forEach(
          other -> {
            other.setDefault(false);
            other.setUpdatedAt(Instant.now());
          });
    }
    method.setDefault(becomesDefault);

    DeliveryMethod saved = methods.save(method);
    if (becomesDefault) {
      account.setDefaultDeliveryMethodId(saved.getId());
    }
    return toResponse(saved);
  }

  private static DeliveryMethodResponse toResponse(DeliveryMethod method) {
    HomeAddressPayload address =
        method.getType() == DeliveryMethodType.HOME_COURIER
            ? new HomeAddressPayload(
                method.getRecipientName(),
                method.getStreet(),
                method.getCity(),
                method.getCounty(),
                method.getPostalCode(),
                method.getAddressDetails())
            : null;
    return new DeliveryMethodResponse(
        method.getId(),
        method.getUserId(),
        method.getType().name(),
        method.getLabel(),
        method.getEasyboxLockerId(),
        method.getLockerName(),
        method.getLockerAddress(),
        address,
        method.getPhone(),
        method.isDefault());
  }

  private static DeliveryMethodType typeOf(String raw) {
    try {
      return DeliveryMethodType.valueOf(raw.strip().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException unknown) {
      throw invalid("Metoda de livrare nu este cunoscută.");
    }
  }

  private static UUID required(Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }
    return viewer.id();
  }

  private static ApiException invalid(String message) {
    return new ApiException(ErrorCode.VALIDATION_FAILED, message);
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }

  private static String trimmed(String value) {
    return blank(value) ? null : value.strip();
  }
}
