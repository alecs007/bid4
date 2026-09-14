package ro.bid4.backend.identity.api;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.identity.api.dto.PublicProfileResponse;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
import ro.bid4.backend.identity.service.PublicProfileService;

@RestController
@RequestMapping("/users")
public class PublicUserController {
  private final PublicProfileService profiles;

  public PublicUserController(PublicProfileService profiles) {
    this.profiles = profiles;
  }

  @GetMapping
  List<PublicUserResponse> search(@RequestParam(name = "q", required = false) String q) {
    return profiles.search(q);
  }

  @GetMapping("/{username}")
  PublicProfileResponse byUsername(@PathVariable String username) {
    return profiles.byUsername(username);
  }
}
