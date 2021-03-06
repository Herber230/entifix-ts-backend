
import amqp = require('amqplib/callback_api');

import { AMQPSender } from '../amqp-sender/AMQPSender';
import { AMQPEventArgs } from '../amqp-event-args/AMQPEventArgs';
import { AMQPEventManager, QueueDescription, ExchangeDescription } from '../amqp-event-manager/AMQPEventManager';
import { EntifixLogger } from '../../app-utilities/logger/entifixLogger';

abstract class AMQPDelegate 
{
    //#region Properties

    private _eventManager : AMQPEventManager;
    private _queueOptions : amqp.Options.AssertQueue;

    //#endregion

    //#region Methods

    constructor( eventManager : AMQPEventManager )
    {
        this._eventManager = eventManager;
    }

    abstract execute( sender : AMQPSender, eventArgs : AMQPEventArgs ) : Promise<void>;

    onMessage( channel : amqp.Channel ) : ( message : amqp.Message) => any
    {
        return message => {

            EntifixLogger.trace({
                message: `Incoming message to delegate [${this.name}] consuming queue [${this.queueDescription.name}]`,
                origin: { file: 'AMQPDelegate', method: 'onMessage' },
                developer: 'herber230' 
            });

            let messageContent = JSON.parse(message.content.toString());
            let sender = new AMQPSender(messageContent);
            
            let eventArgs = new AMQPEventArgs(messageContent, { originalMessage: message, channel, serviceSession: this._eventManager.serviceSession });

            let executionTask = this.execute( sender, eventArgs );

            if (executionTask instanceof Promise) {
                executionTask.then( () =>  {
                    channel.ack(message);
                }).catch( () => { 
                    channel.reject(message);
                });
            }

            /***
             * Definition pending for error on delegates
             */
        }        
    }

    //#endregion

    //#region Accessors

    abstract get queueDescription () : QueueDescription;

    get exchangeDescription() : ExchangeDescription
    { return null; }
    
    get routingKeyPattern(): string
    {
        return null;
    }

    get channelName () : string
    { return 'mainChannel' }

    get eventManager ()
    { return this._eventManager; }

    get name() : string
    { return this.constructor.name; }


    //#endregion

}


export { AMQPDelegate }


