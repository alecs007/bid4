package ro.bid4.backend.identity.api;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.identity.api.dto.DeliveryMethodRequest;
import ro.bid4.backend.identity.api.dto.DeliveryMethodResponse;
import ro.bid4.backend.identity.service.DeliveryMethods;
import ro.bid4.backend.security.web.Viewers;

@RestController
@RequestMapping("/users/me/delivery-methods")
public class DeliveryMethodController {
  private final DeliveryMethods methods;

  public DeliveryMethodController(DeliveryMethods methods) {
    this.methods = methods;
  }

  @GetMapping
  List<DeliveryMethodResponse> list(@AuthenticationPrincipal Jwt jwt) {
    return methods.list(Viewers.from(jwt));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  DeliveryMethodResponse create(
      @Valid @RequestBody DeliveryMethodRequest request, @AuthenticationPrincipal Jwt jwt) {
    return methods.create(request, Viewers.from(jwt));
  }
}
