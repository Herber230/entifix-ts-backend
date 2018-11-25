import amqp = require('amqplib/callback_api');
import { AMQPSender } from '../amqp-sender/AMQPSender';
import { AMQPEventArgs } from '../amqp-event-args/AMQPEventArgs';
import { AMQPEventManager } from '../amqp-event-manager/AMQPEventManager';
declare abstract class AMQPDelegate {
    private _eventManager;
    private _queueOptions;
    constructor(eventManager: AMQPEventManager);
    abstract execute(sender: AMQPSender, eventArgs: AMQPEventArgs): Promise<void>;
    onMessage(channel: amqp.Channel): (message: amqp.Message) => any;
    readonly queueName: string;
    readonly queueOptions: amqp.Options.AssertQueue;
    readonly exchangeName: string;
    readonly channelName: string;
    readonly eventManager: AMQPEventManager;
}
export { AMQPDelegate };
