package ro.bid4.backend.inbox.service;

import java.nio.charset.StandardCharsets;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

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
