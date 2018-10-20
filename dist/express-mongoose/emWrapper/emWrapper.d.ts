import mongoose = require('mongoose');
import express = require('express');
import { EMEntity } from '../emEntity/emEntity';
import { EMSession } from '../emSession/emSession';
declare class EMResponseWrapper<TDocument extends mongoose.Document, TEntity extends EMEntity> {
    private _session;
    constructor(session: EMSession);
    object(response: express.Response, object: any): any;
    object(response: express.Response, object: any, options: {
        devData?: any;
        status?: number;
    }): any;
    document(response: express.Response, document: TDocument): void;
    document(response: express.Response, document: TDocument, options: {
        devData?: any;
        status?: number;
    }): void;
    entity(response: express.Response, entity: TEntity): void;
    entity(response: express.Response, entity: TEntity, options: {
        devData?: any;
    }): void;
    documentCollection(response: express.Response, documents: Array<TDocument>): any;
    documentCollection(response: express.Response, documents: Array<TDocument>, options: {
        devData?: any;
    }): any;
    entityCollection(response: express.Response, entities: Array<TEntity>): any;
    entityCollection(response: express.Response, entities: Array<TEntity>, options: {
        devData?: any;
    }): any;
    exception(response: express.Response, error: any): void;
    handledError(response: express.Response, message: string, status: number): void;
    handledError(response: express.Response, message: string, status: number, errorDetails: any): void;
    logicError(response: express.Response, message: string): void;
    logicError(response: express.Response, message: string, options: {
        errorDetails?: any;
        devData?: any;
    }): void;
    logicAccept(response: express.Response, message: string): any;
    logicAccept(response: express.Response, message: string, details: any): any;
}
export { EMResponseWrapper };