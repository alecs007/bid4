package ro.bid4.backend.shipping.api;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.shipping.service.CourierGateway;
import ro.bid4.backend.shipping.service.Locker;

@RestController
@RequestMapping("/shipping/lockers")
public class LockerController {
  private final CourierGateway courier;

  public LockerController(CourierGateway courier) {
    this.courier = courier;
  }

  @GetMapping
  List<Locker> search(@RequestParam(name = "q", required = false) String query) {
    return courier.lockers(query);
  }
}
