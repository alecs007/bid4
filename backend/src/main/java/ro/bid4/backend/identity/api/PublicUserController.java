package ro.bid4.backend.identity.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.identity.api.dto.PublicProfileResponse;
import ro.bid4.backend.identity.service.PublicProfileService;

/**
 * The public profile at /profil/[username].
 *
 * <p>Looked up by username rather than by id, which is what the route carries and what a person can
 * actually share. The response is PublicUserResponse and never UserResponse, so the address and the
 * account's state cannot travel with it.
 */
@RestController
@RequestMapping("/users")
public class PublicUserController {

  private final PublicProfileService profiles;

  public PublicUserController(PublicProfileService profiles) {
    this.profiles = profiles;
  }

  @GetMapping("/{username}")
  PublicProfileResponse byUsername(@PathVariable String username) {
    return profiles.byUsername(username);
  }
}
