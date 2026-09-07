package ro.bid4.backend.inbox.service;

import java.nio.charset.StandardCharsets;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

/**
 * The half of the fan-out that listens.
 *
 * <p>Every instance subscribes to the one channel and hands what arrives to {@link InboxEvents},
 * which delivers to whichever browser tabs it happens to be holding. The instance that published is
 * subscribed too — that is deliberate, so there is one delivery path rather than a local one and a
 * remote one that would have to agree with each other.
 */
@Configuration
public class InboxEventsConfig {

  @Bean
  RedisMessageListenerContainer inboxEventListener(
      RedisConnectionFactory connectionFactory, InboxEvents events) {

    RedisMessageListenerContainer container = new RedisMessageListenerContainer();
    container.setConnectionFactory(connectionFactory);
    container.addMessageListener(
        (message, pattern) -> events.deliver(new String(message.getBody(), StandardCharsets.UTF_8)),
        ChannelTopic.of(InboxEvents.CHANNEL));
    return container;
  }
}
