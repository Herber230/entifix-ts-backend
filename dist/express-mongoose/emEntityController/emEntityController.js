"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emSession_1 = require("../emSession/emSession");
const emEntity_1 = require("../emEntity/emEntity");
const emWrapper_1 = require("../emWrapper/emWrapper");
const HttpStatus = require("http-status-codes");
const express = require("express");
const hcMetaData_1 = require("../../hc-core/hcMetaData/hcMetaData");
const emModifyResponseContent_1 = require("./emModifyResponseContent");
class EMEntityController {
    constructor(entityName, routerManager, options) {
        this._entityName = entityName;
        this._routerManager = routerManager;
        this._useEntities = true;
        this._responseWrapper = new emWrapper_1.EMResponseEntityWrapper(routerManager.serviceSession);
        this._resourceName = options && options.resourceName ? options.resourceName : entityName.toLowerCase();
        this._router = express.Router();
        this._definedRouteMethods = this.getDefinedRouteMethods();
        this.createRoutes();
    }
    createRoutes() {
        // It is important to consider the order of the class methods setted for the HTTP Methods
        //CRUD methods
        this._router.get('/' + this._resourceName, (request, response, next) => this.retrieve(request, response));
        this._router.get('/' + this._resourceName + '/:path*', (request, response, next) => this.resolveComplexRetrieveMethod(request, response, next));
        this._router.post('/' + this._resourceName, (request, response, next) => this.create(request, response));
        this._router.post('/' + this._resourceName + '/:path*', (request, response, next) => this.resolveComplexCreateMethod(request, response, next));
        this._router.put('/' + this._resourceName, (request, response, next) => this.update(request, response));
        this._router.put('/' + this._resourceName + '/:path*', (request, response, next) => this.resolveComplexUpdateMethod(request, response, next));
        this._router.delete('/' + this._resourceName + '/:path*', (request, response, next) => this.resolveComplexDeleteMethod(request, response, next));
        //Operator methods
        if (this.entityInfo.getDefinedMethods().length > 0)
            this._router.patch('/' + this._resourceName + '/:_id', (request, response, next) => this.action(request, response));
    }
    //#endregion
    //#region On request/response session  methods
    retrieve(request, response) {
        this.createSession(request, response).then(session => {
            if (session) {
                //Manage query params options
                let queryParamsConversion = this.validateQueryParams(request, response);
                if (queryParamsConversion.error) {
                    this._responseWrapper.handledError(response, 'BAD QUERY PARAM', 400, { details: queryParamsConversion.error });
                    return;
                }
                let queryParams = queryParamsConversion.queryParams;
                let filterParam = queryParams.filter(qp => qp.paramName == 'filter');
                let filters = filterParam.length > 0 ? filterParam.map(qp => qp) : null;
                let sortParam = queryParams.filter(qp => qp.paramName == 'sort');
                let sorting = sortParam.length > 0 ? sortParam.map(qp => qp) : null;
                let skipParam = queryParams.find(qp => qp.paramName == 'skip');
                let skip = skipParam != null ? parseInt(skipParam.paramValue) : null;
                let takeParam = queryParams.find(qp => qp.paramName == 'take');
                let take = takeParam != null ? parseInt(takeParam.paramValue) : 100; // Retrive limit protector
                //Call the execution of mongo query inside EMSession
                if (this._useEntities)
                    session.listEntities(this._entityName, { filters, skip, take, sorting }).then(results => {
                        let det = results.details || {};
                        if (emModifyResponseContent_1.EMModifyResponseContent.modificationRequested(request)) {
                            if (emModifyResponseContent_1.EMModifyResponseContent.canRequestThisType(request, this.entityInfo)) {
                                emModifyResponseContent_1.EMModifyResponseContent.modify(request, this.entityInfo, session, { entities: results.entities })
                                    .then(file => { this._responseWrapper.file(response, file); })
                                    .catch(error => { this._responseWrapper.handledError(response, "Error to generate file in reports service. " + error, HttpStatus.BAD_GATEWAY, error); });
                            }
                            else {
                                this._responseWrapper.handledError(response, "Method not allowed", HttpStatus.METHOD_NOT_ALLOWED);
                            }
                        }
                        else {
                            this._responseWrapper.entityCollection(response, results.entities, { total: det.total, skip: det.skip, take: det.take, devData: det.devData });
                        }
                    }, error => this._responseWrapper.exception(response, error)).catch(error => this._responseWrapper.exception(response, error));
                else
                    session.listDocuments(this._entityName, { filters, skip, take, sorting }).then(results => {
                        let det = results.details || {};
                        this._responseWrapper.documentCollection(response, results.docs, { total: det.total, skip: det.skip, take: det.take, devData: det.devData });
                    }, error => this._responseWrapper.exception(response, error)).catch(error => this._responseWrapper.exception(response, error));
            }
        });
    }
    retrieveById(request, response, options) {
        this.createSession(request, response).then(session => {
            if (session) {
                let paramName = options && options.paramName ? options.paramName : '_id';
                if (this._useEntities)
                    session.findEntity(this.entityInfo, request.params[paramName]).then(entityResult => this._responseWrapper.entity(response, entityResult), error => this._responseWrapper.exception(response, error)).catch(error => this._responseWrapper.exception(response, error));
                else
                    session.findDocument(this._entityName, request.params[paramName]).then(docResult => this._responseWrapper.document(response, docResult), error => this._responseWrapper.exception(response, error)).catch(error => this._responseWrapper.exception(response, error));
            }
        });
    }
    retriveMetadata(request, response, next) {
        this.createSession(request, response).then(session => {
            if (session) {
                this._responseWrapper.object(response, session.getMetadataToExpose(this._entityName));
            }
        });
    }
    create(request, response) {
        this.createSession(request, response).then(session => {
            if (session) {
                if (!this._useEntities) {
                    session.createDocument(this.entityName, request.body).then(result => this._responseWrapper.document(response, result, { status: HttpStatus.CREATED }), error => this._responseWrapper.exception(response, error)).catch(error => this._responseWrapper.exception(response, error));
                }
                else
                    this.save(session);
            }
        });
    }
    update(request, response) {
        this.createSession(request, response).then(session => {
            if (session) {
                if (!this._useEntities) {
                    session.updateDocument(this._entityName, request.body).then(result => this._responseWrapper.document(response, result, { status: HttpStatus.ACCEPTED }), error => this._responseWrapper.exception(response, error)).catch(error => this._responseWrapper.exception(response, error));
                }
                else
                    this.save(session);
            }
        });
    }
    delete(request, response, options) {
        this.createSession(request, response).then(session => {
            if (session) {
                let paramName = options && options.paramName ? options.paramName : '_id';
                let id = request.params[paramName];
                let responseOk = () => this._responseWrapper.object(response, { 'Delete status': 'register deleted ' });
                let responseError = error => this._responseWrapper.exception(response, responseError);
                if (this._useEntities) {
                    session.findEntity(this.entityInfo, id).then(entity => {
                        entity.delete().then(movFlow => {
                            if (movFlow.continue)
                                responseOk();
                            else
                                this._responseWrapper.logicError(response, movFlow.message, movFlow.details);
                        });
                    }, error => this._responseWrapper.exception(response, error)).catch(error => this._responseWrapper.exception(response, error));
                }
                else {
                    session.findDocument(this._entityName, request.params[paramName]).then(docResult => session.deleteDocument(this._entityName, docResult).then(responseOk, responseError), error => this._responseWrapper.exception(response, error)).catch(error => this._responseWrapper.exception(response, error));
                }
            }
        });
    }
    save(session) {
        this.validateDocumentRequest(session.request, session.response).then((validation) => {
            if (validation) {
                session.activateEntityInstance(this.entityInfo, validation.document, { changes: validation.changes }).then(entity => {
                    entity.save().then(movFlow => {
                        if (movFlow.continue)
                            this._responseWrapper.entity(session.response, entity, { devData: validation.devData });
                        else
                            this._responseWrapper.logicError(session.response, movFlow.message, { errorDetails: movFlow.details, devData: validation.devData });
                    }, error => this._responseWrapper.exception(session.response, error)).catch(error => this._responseWrapper.exception(session.response, error));
                }, error => this._responseWrapper.exception(session.response, error)).catch(error => this._responseWrapper.exception(session.response, error));
            }
        }).catch(error => this._responseWrapper.exception(session.response, error));
    }
    action(request, response, options) {
        let paramId = options ? options.paramId : '_id';
        let validation = this.validateActionRequest(request, response);
        if (validation.isValidPayload) {
            this.createSession(request, response).then(session => {
                if (session) {
                    let id = request.params[paramId];
                    session.findEntity(this.entityInfo, id).then(entity => {
                        let methodInstace = entity[validation.methodName];
                        let methodInfo = this.entityInfo.getDefinedMethods().find(dm => dm.name == validation.methodName);
                        if (methodInstace && methodInfo) {
                            let specialParameters = [session];
                            let allParameters = [];
                            if (validation.parameters)
                                allParameters = [...validation.parameters, specialParameters];
                            //EXECUTE ACTION INSIDE ENTITY
                            let returnedFromAction = methodInstace.apply(entity, allParameters);
                            if (methodInfo.eventName) {
                                let checkAndPublishData = resultData => {
                                    if (resultData.continue != null) {
                                        if (resultData.continue == true) {
                                            let eventData = resultData.data || entity;
                                            session.publishAMQPAction(methodInfo, id, eventData);
                                            resolveRequest(resultData);
                                        }
                                        else
                                            this.responseWrapper.logicError(response, resultData.message);
                                    }
                                    else {
                                        session.publishAMQPAction(methodInfo, id, resultData);
                                        resolveRequest(resultData);
                                    }
                                };
                                let resolveRequest = data => {
                                    if (methodInfo.returnActionData)
                                        this.responseWrapper.logicAccept(response, "Operación ejecutada", data);
                                    else
                                        this.responseWrapper.logicAccept(response, "Operación ejecutada");
                                };
                                if (returnedFromAction instanceof Promise)
                                    returnedFromAction.then(result => checkAndPublishData(result));
                                else
                                    checkAndPublishData(returnedFromAction);
                            }
                            else {
                                let processResult = (methodResult) => {
                                    if (methodResult.continue != null) {
                                        let result = methodResult;
                                        if (result.continue)
                                            this.responseWrapper.logicAccept(response, "Operación ejecutada", result.details);
                                        else
                                            this.responseWrapper.logicError(response, result.message, result.details);
                                    }
                                    else {
                                        if (!returnedFromAction)
                                            this.responseWrapper.logicAccept(response, "Operación ejecutada");
                                        else
                                            this.responseWrapper.logicError(response, "Operación no ejectuada", returnedFromAction);
                                    }
                                };
                                if (returnedFromAction instanceof Promise)
                                    returnedFromAction.then(result => processResult(result));
                                else
                                    processResult(returnedFromAction);
                            }
                        }
                        else
                            this._responseWrapper.handledError(response, 'NOT FOUND OPERATION FOR ENTITY', HttpStatus.NOT_FOUND);
                    }).catch(e => this._responseWrapper.exception(response, e));
                }
            });
        }
    }
    //#endregion
    //#region Utility methods
    createSession(request, response) {
        let responseWithException = error => {
            let e = this._routerManager.serviceSession.createError(error, 'Error on create session for the request');
            this._responseWrapper.exception(response, e);
        };
        return new Promise((resolve, reject) => {
            let newSession = new emSession_1.EMSession(this._routerManager.serviceSession, { request, response });
            //Execute another async tasks before using the new session
            //...
            //...
            //...
            resolve(newSession);
        })
            .then(session => session)
            .catch(error => responseWithException(error));
    }
    validateQueryParams(request, response) {
        let queryParams = new Array();
        if (request.query != null)
            for (var qp in request.query) {
                switch (qp) {
                    case 'fixed_filter':
                        let addFixedFilter = fv => queryParams.push(new Filter(fv, emSession_1.FilterType.Fixed));
                        let fixedFilterValue = request.query[qp];
                        if (fixedFilterValue instanceof Array)
                            fixedFilterValue.forEach(addFixedFilter);
                        else
                            addFixedFilter(fixedFilterValue);
                        break;
                    case 'optional_filter':
                        let addOptionalFilter = fv => queryParams.push(new Filter(fv, emSession_1.FilterType.Optional));
                        let optionalFilterValue = request.query[qp];
                        if (optionalFilterValue instanceof Array)
                            optionalFilterValue.forEach(addOptionalFilter);
                        else
                            addOptionalFilter(optionalFilterValue);
                        break;
                    case 'order_by':
                        let addSorting = sv => queryParams.push(new Sort(sv));
                        let sortValue = request.query[qp];
                        if (sortValue instanceof Array)
                            sortValue.forEach(addSorting);
                        else
                            addSorting(sortValue);
                        break;
                    case 'skip':
                    case 'take':
                        queryParams.push(new QueryParam(qp, request.query[qp]));
                        break;
                    //To implmente more query params
                    //case <nameparam>:
                    //...
                    //...
                    //  break;
                    default:
                        let details = { message: `Query param not allowed "${qp}"` };
                        this._responseWrapper.handledError(response, 'BAD QUERY PARAM', HttpStatus.BAD_REQUEST, details);
                        return { error: true };
                }
            }
        return { error: false, queryParams };
    }
    validateDocumentRequest(request, response, options) {
        return new Promise((resolve, reject) => {
            //Defaults
            let alwaysNew = options && options.alwaysNew != null ? options.alwaysNew : false;
            if ((typeof request.body) != 'object')
                return resolve({ error: 'The data provided is not an object', errorData: request });
            let parsedRequest = emEntity_1.EMEntity.deserializeAccessors(this.entityInfo, request.body);
            if (parsedRequest.nonValid)
                return resolve({ error: 'There are non valid values for the resource', errorData: parsedRequest.nonValid });
            let devData;
            let addDevData = newDevData => {
                if (!devData)
                    devData = new Array();
                devData.push(newDevData);
            };
            if (parsedRequest.readOnly)
                addDevData({ message: 'The request has read only accessors and these are going to be ignored', accessors: parsedRequest.readOnly });
            if (parsedRequest.nonPersistent)
                addDevData({ message: 'The request has non persistent accessors and these could be ignored', accessors: parsedRequest.nonPersistent });
            this.createSession(request, response).then(session => {
                if (session) {
                    if (parsedRequest.persistent._id && !alwaysNew) {
                        session.findDocument(this._entityName, parsedRequest.persistent._id).then(document => {
                            delete parsedRequest.persistent._id;
                            let changes;
                            for (let p in parsedRequest.persistent) {
                                let oldValue = document[p];
                                let newValue = parsedRequest.persistent[p];
                                if (oldValue != newValue) {
                                    if (!changes)
                                        changes = [];
                                    changes.push({ property: p, oldValue, newValue });
                                }
                            }
                            document.set(parsedRequest.persistent);
                            resolve({ document, devData, changes, session });
                        }, err => reject(err));
                    }
                    else {
                        let model = session.getModel(this._entityName);
                        let document;
                        document = new model(parsedRequest.persistent);
                        resolve({ document, devData, session });
                    }
                }
            });
        }).then(validation => {
            if (validation.error) {
                let details = {
                    validationError: validation.error,
                    validationDetails: validation.errorData
                };
                this._responseWrapper.handledError(response, 'NOT VALID PAYLOAD FOR THE RESOURCE', HttpStatus.BAD_REQUEST, details);
                return null;
            }
            return validation;
        }, error => this._responseWrapper.exception(response, error)).catch(error => this._responseWrapper.exception(response, error));
    }
    validateActionRequest(request, response) {
        let simpleObject = request.body;
        let parameters;
        let responseWithBadRequest = (message, nonValid) => {
            let details = { errorDescription: message };
            if (nonValid)
                details.nonValid = nonValid;
            this._responseWrapper.handledError(response, 'Not valid payload', HttpStatus.BAD_REQUEST, details);
            return { isValidPayload: false };
        };
        let operator = simpleObject.op;
        if (!operator)
            return responseWithBadRequest('The operator is required in the payload. { op: <operatorValue> }');
        let methodInfo = this.entityInfo.getDefinedMethods().find(dm => dm.name == operator);
        if (!methodInfo)
            return responseWithBadRequest(`The entity ${this.entityInfo.name} does not contains a defined action "${operator}" that could be used as operation`);
        let expectingParams = methodInfo.parameters && methodInfo.parameters.length > 0;
        if (expectingParams && !simpleObject.parameters)
            return responseWithBadRequest(`The method ${operator} is expecting parameters`);
        if (methodInfo.parameters != null && methodInfo.parameters.length > 0) {
            if (!(simpleObject.parameters instanceof Array))
                return responseWithBadRequest(`The parameters field must be an Array of objects: { parameres: Array<{key,value}>}`);
            if (simpleObject.parameters.filter(a => !a.key || !a.value).length > 0)
                return responseWithBadRequest(`Each parameter has to define 'key' and 'value' properties: { parameters: Array<key,value>}`);
            let emptyRequired;
            let requiredParameters = methodInfo.parameters.filter(p => p.required);
            for (let i = 0; i < requiredParameters.length; i++) {
                let reqParam = requiredParameters[i];
                let incomingParam = simpleObject.parameters.find(inParam => inParam.key == reqParam.name);
                if (!incomingParam || !incomingParam.value) {
                    emptyRequired = incomingParam.key;
                    break;
                }
            }
            if (emptyRequired)
                return responseWithBadRequest(`The parameter "${emptyRequired}" is required for method "${operator}"`);
        }
        parameters = simpleObject.parameters;
        delete simpleObject.op;
        delete simpleObject.methodName;
        delete simpleObject.parameters;
        let nonValid = Object.keys(simpleObject).length > 0 ? simpleObject : null;
        if (nonValid)
            return responseWithBadRequest(`There is non valid data in the request`, nonValid);
        return { isValidPayload: true, methodName: operator, parameters };
    }
    //#endregion
    //#region On complex request/response session methods
    getArrayPath(request) {
        let arrayPath = request.path.split('/');
        let basePathCount = 2;
        if (this._routerManager.basePath)
            basePathCount++;
        arrayPath.splice(0, basePathCount);
        return arrayPath;
    }
    getDefinedRouteMethods() {
        return [{ pathName: 'metadata', httpMethod: 'GET', method: (req, res, next) => this.retriveMetadata(req, res, next) }];
    }
    createMappingPath(arrayPath) {
        if (arrayPath.length > 1) {
            let baseTypeName = this._entityName;
            let instanceId = arrayPath[0];
            let endAccessorInfo;
            let pathOverInstance = new Array();
            let accesor = this.getExtensionAccessors(baseTypeName).find(ea => ea.activator.resourcePath == arrayPath[1]);
            if (accesor) {
                endAccessorInfo = accesor;
                pathOverInstance.push(accesor.name);
                let i = 2;
                while (i < arrayPath.length) {
                    let newAccessorInPath = this.getExtensionAccessors(accesor.className).find(ea => ea.activator.resourcePath == arrayPath[i]);
                    if (newAccessorInPath) {
                        pathOverInstance.push(newAccessorInPath.name);
                        endAccessorInfo = newAccessorInPath;
                        if (accesor.type == 'Array' && accesor.activator.bindingType == hcMetaData_1.MemberBindingType.Reference) {
                            baseTypeName = accesor.className;
                            instanceId = arrayPath[i - 1];
                            endAccessorInfo = newAccessorInPath;
                            pathOverInstance = [newAccessorInPath.name];
                        }
                        accesor = newAccessorInPath;
                    }
                    else
                        pathOverInstance.push(arrayPath[i]);
                    i++;
                }
                return { baseTypeName, instanceId, endAccessorInfo, pathOverInstance };
            }
            else
                null;
        }
        else
            return null;
    }
    resolveComplexRetrieveMethod(request, response, next) {
        let arrayPath = this.getArrayPath(request);
        if (arrayPath.length > 1) {
            let mappingPath = this.createMappingPath(arrayPath);
            if (mappingPath)
                this.createSession(request, response).then(session => {
                    if (session) {
                        this._routerManager.resolveComplexRetrieve(session, mappingPath.baseTypeName, mappingPath.instanceId, mappingPath.endAccessorInfo, mappingPath.pathOverInstance);
                    }
                });
            else
                next();
        }
        else {
            switch (arrayPath[0]) {
                case 'metadata':
                    this.retriveMetadata(request, response, next);
                    break;
                default:
                    this.retrieveById(request, response, { paramName: 'path' });
                    break;
            }
        }
    }
    resolveComplexCreateMethod(request, response, next) {
        let arrayPath = this.getArrayPath(request);
        let mappingPath = this.createMappingPath(arrayPath);
        if (mappingPath)
            this.createSession(request, response).then(session => {
                if (session) {
                    this._routerManager.resolveComplexCreate(session, mappingPath.baseTypeName, mappingPath.instanceId, mappingPath.endAccessorInfo, mappingPath.pathOverInstance);
                }
            });
        else
            next();
    }
    resolveComplexUpdateMethod(request, response, next) {
        let arrayPath = this.getArrayPath(request);
        let mappingPath = this.createMappingPath(arrayPath);
        if (mappingPath)
            this.createSession(request, response).then(session => {
                if (session) {
                    this._routerManager.resolveComplexUpdate(session, mappingPath.baseTypeName, mappingPath.instanceId, mappingPath.endAccessorInfo, mappingPath.pathOverInstance);
                }
            });
        else
            next();
    }
    resolveComplexDeleteMethod(request, response, next) {
        let arrayPath = this.getArrayPath(request);
        if (arrayPath.length > 1) {
            let mappingPath = this.createMappingPath(arrayPath);
            if (mappingPath)
                this.createSession(request, response).then(session => {
                    if (session) {
                        this._routerManager.resolveComplexDelete(session, mappingPath.baseTypeName, mappingPath.instanceId, mappingPath.endAccessorInfo, mappingPath.pathOverInstance);
                    }
                });
            else
                next();
        }
        else
            this.delete(request, response, { paramName: 'path' });
    }
    findEntity(session, id) {
        return session.findEntity(this.entityInfo, id);
    }
    createInstance(request, response, options) {
        return new Promise((resolve, reject) => {
            this.validateDocumentRequest(request, response, options).then((validation) => {
                if (validation) {
                    validation.session.activateEntityInstance(this.entityInfo, validation.document).then(entity => resolve(entity), error => this._responseWrapper.exception(response, error)).catch(error => this._responseWrapper.exception(response, error));
                }
            });
        });
    }
    getExtensionAccessors(entityName) {
        return this._routerManager
            .serviceSession
            .getInfo(entityName)
            .getAllMembers()
            .filter(memberInfo => memberInfo instanceof hcMetaData_1.AccessorInfo && memberInfo.activator != null && memberInfo.activator.extendRoute == true)
            .map(memberInfo => memberInfo);
    }
    //#endregion
    //#endregion
    //#region Accessors (Properties)
    get entityInfo() {
        return this._routerManager.serviceSession.getInfo(this._entityName);
    }
    get entityName() { return this._entityName; }
    get useEntities() { return this._useEntities; }
    set useEntities(value) { this._useEntities = value; }
    get router() { return this._router; }
    get responseWrapper() {
        return this._responseWrapper;
    }
    get resourceName() { return this._resourceName; }
}
exports.EMEntityController = EMEntityController;
class QueryParam {
    //#endregion
    //#region Methods
    constructor(paramName, paramValue) {
        this._paramName = paramName;
        this._paramValue = paramValue;
    }
    //#endregion
    //#region Accessors
    get paramName() { return this._paramName; }
    set paramName(value) { this._paramName = value; }
    get paramValue() { return this._paramValue; }
    set paramValue(value) { this._paramValue = value; }
}
class Sort extends QueryParam {
    //#endregion
    //#region Methods
    constructor(paramValue) {
        super('sort', paramValue);
        this.manageValue();
    }
    manageValue() {
        let splitted = this._paramValue.split('|');
        this._property = splitted[0];
        this._sortType = emSession_1.SortType.ascending; // Default value
        if (splitted[1] == 'desc')
            this._sortType = emSession_1.SortType.descending;
    }
    //#endregion
    //#region Accessors
    get property() { return this._property; }
    set property(value) { this._property = value; }
    get sortType() { return this._sortType; }
    set sortType(value) { this._sortType = value; }
}
class Filter extends QueryParam {
    //#endregion
    //#region Methods
    constructor(paramValue, filterType) {
        super('filter', paramValue);
        this._filterType = filterType;
        this.manageValue();
    }
    manageValue() {
        let splitted = this._paramValue.split('|');
        this._property = splitted[0];
        if (this._property.split(".").length > 1) {
            this._complexFilter = true;
            this._parentProperty = this._property.split(".")[0];
            this._property = this._property.split(".")[1];
        }
        else {
            this._complexFilter = false;
            this._parentProperty = null;
        }
        this._operator = splitted[1];
        if (splitted[2] == 'null' || splitted[2] == 'undefined')
            this._value = null;
        else
            this._value = splitted[2];
    }
    //#endregion
    //#region Accessors
    get property() { return this._property; }
    set property(value) { this._property = value; }
    get operator() { return this._operator; }
    set operator(value) { this._operator = value; }
    get value() { return this._value; }
    set value(v) { this._value = v; }
    get filterType() { return this._filterType; }
    set filterType(value) { this._filterType = value; }
    get complexFilter() { return this._complexFilter; }
    set complexFilter(value) { this._complexFilter = value; }
    get parentProperty() { return this._parentProperty; }
    set parentProperty(value) { this._parentProperty = value; }
}
//# sourceMappingURL=emEntityController.js.map