import amqp from "amqplib";
import { config } from "./config";
import { PaymentEventsHandler } from "./events/payment.events.handler";
import { InitiateRefundEvent, logger, RoutingKey } from "docta-package";

interface ListenerOption {
  exchange: string;
  queue: string;
  routingKeys: string[];
}

export async function listenToQueue({
  exchange,
  queue,
  routingKeys,
}: ListenerOption) {
  try {
    const paymentEventsHandler = new PaymentEventsHandler();

    const connection = await amqp.connect(config.rabbitmqHost);
    const channel = await connection.createChannel();
    const dlq = `${queue}.dlq`;

    // Exchange assertion
    await channel.assertExchange(exchange, "topic", { durable: true });

    // Dead Letter Queue assertion
    await channel.assertQueue(dlq, { durable: true });

    // Main queue with DLQ routing
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": exchange,
        "x-dead-letter-routing-key": `${queue}.dlq`,
      },
    });

    // Bind queues
    for (const key of routingKeys) {
      await channel.bindQueue(queue, exchange, key);
    }
    await channel.bindQueue(dlq, exchange, `${queue}.dlq`);

    console.log(`🎧 Listening on "${queue}" for: [${routingKeys.join(", ")}]`);

    await channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;

        const routingKey = msg.fields.routingKey;
        const content = msg.content.toString();

        try {
          const data = JSON.parse(content);

          switch (routingKey) {
            case RoutingKey.INITIATE_REFUND:
              await paymentEventsHandler.initiateRefundHandler(
                data as InitiateRefundEvent
              );
              break;

            default:
              console.warn("⚠️ Unhandled routing key:", routingKey, data);
          }

          channel.ack(msg);
        } catch (err: any) {
          console.error("❌ Failed to process message:", err);
          logger.error("Unhandled error", {
            message: err.message,
            stack: err.stack,
          });

          // ✅ Use safe access with fallback
          const headers = msg.properties?.headers ?? {};
          const retryCount = (headers["x-retry-count"] as number) ?? 0;

          if (retryCount < 3) {
            console.log(`🔁 Retrying message (${retryCount + 1}/3)`);
            channel.publish(exchange, msg.fields.routingKey, msg.content, {
              headers: { "x-retry-count": retryCount + 1 },
            });
            channel.ack(msg);
          } else {
            console.log("💀 Moving message to DLQ after 3 failed attempts");
            // Let RabbitMQ send it to DLQ automatically
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );
  } catch (error: any) {
    console.error("Error setting up listener:", error);
    logger.error("Unhandled error", {
      message: error.message,
      stack: error.stack,
    });
  }
}
