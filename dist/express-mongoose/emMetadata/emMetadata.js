"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hcMetaData_1 = require("../../hc-core/hcMetaData/hcMetaData");
class GfsMemberActivator extends hcMetaData_1.MemberActivator {
    constructor(resourcePath, extendedRoute, options) {
        super(hcMetaData_1.MemberBindingType.Chunks, extendedRoute, resourcePath);
        this._defaultSchema = options && options.schema ? options.schema : { _id: String, name: String, fileExtension: String, size: Number };
    }
    activateMember(entity, session, accessorInfo, options) {
        switch (this.bindingType) {
            //shir: case para chunk
            case hcMetaData_1.MemberBindingType.Chunks:
                return this.loadFileHeader(entity, session, accessorInfo, options);
        }
    }
    loadFileHeader(entity, session, accessorInfo, options) {
        return new Promise((resolve, reject) => {
            let doc = entity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let docData = doc[persistentMember];
            let oldValue;
            let newValue;
            if (docData) {
                newValue = docData;
            }
            if (options && options.oldValue) {
                oldValue = options.oldValue;
            }
            resolve({ newValue, oldValue });
        });
    }
    //#endregion
    //#region Accessors
    get referenceType() { return this.bindingType == hcMetaData_1.MemberBindingType.Reference ? 'object' : null; }
    get defaultSchema() { return this._defaultSchema; }
}
exports.GfsMemberActivator = GfsMemberActivator;
class EMMemberActivator extends hcMetaData_1.MemberActivator {
    constructor(entityInfo, bindingType, extendRoute, options) {
        super(bindingType, extendRoute, options != null && options.resourcePath != null ? options.resourcePath : entityInfo.name.toLowerCase());
        this._entityInfo = entityInfo;
    }
    activateMember(entity, session, accessorInfo, options) {
        switch (this.bindingType) {
            case hcMetaData_1.MemberBindingType.Reference:
                if (accessorInfo.type == 'Array')
                    return this.loadArrayInstanceFromDB(entity, session, accessorInfo, options);
                else
                    return this.loadSingleInstanceFromDB(entity, session, accessorInfo, options);
            case hcMetaData_1.MemberBindingType.Snapshot:
                if (accessorInfo.type == 'Array')
                    return this.castArrayInstanceInEntity(entity, session, accessorInfo, options);
                else
                    return this.castSingleInstanceInEntity(entity, session, accessorInfo, options);
        }
    }
    loadSingleInstanceFromDB(baseEntity, session, accessorInfo, options) {
        return new Promise((resolve, reject) => {
            let doc = baseEntity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let id = doc[persistentMember];
            let oldValue;
            let newValue;
            let promises = new Array();
            if (id)
                promises.push(session.findEntity(this.entityInfo, id).then(entity => {
                    baseEntity[accessorInfo.name] = entity;
                    newValue = entity;
                }));
            if (options && options.oldValue)
                promises.push(session.findEntity(this.entityInfo, options.oldValue).then(entity => {
                    oldValue = entity;
                }));
            Promise.all(promises).then(() => { resolve({ oldValue, newValue }); }, error => reject(error)).catch(error => reject(error));
        });
    }
    loadArrayInstanceFromDB(baseEntity, session, accessorInfo, options) {
        return new Promise((resolve, reject) => {
            let doc = baseEntity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let promises = new Array();
            let oldValue;
            let newValue;
            let filters = { _id: { $in: doc[persistentMember] } };
            if (filters._id.$in && filters._id.$in.length > 0)
                promises.push(session.listEntitiesByQuery(this.entityInfo, filters).then(entities => {
                    baseEntity[accessorInfo.name] = entities;
                }));
            if (options && options.oldValue)
                promises.push(session.listEntitiesByQuery(this.entityInfo, { _id: { $in: options.oldValue } }).then(entities => {
                    baseEntity[accessorInfo.name] = entities;
                }));
            Promise.all(promises).then(() => { resolve({ oldValue, newValue }); }, error => reject(error)).catch(error => reject(error));
        });
    }
    castSingleInstanceInEntity(baseEntity, session, accessorInfo, options) {
        return new Promise((resolve, reject) => {
            let doc = baseEntity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let docData = doc[persistentMember];
            let promises = new Array();
            let oldValue;
            let newValue;
            if (docData) {
                let model = session.getModel(this.entityInfo.name);
                let document = new model(docData);
                promises.push(session.activateEntityInstance(this.entityInfo, document).then(entity => {
                    baseEntity[accessorInfo.name] = entity;
                    newValue = entity;
                }));
            }
            if (options && options.oldValue) {
                let model = session.getModel(this.entityInfo.name);
                let document = new model(options.oldValue);
                promises.push(session.activateEntityInstance(this.entityInfo, document).then(entity => {
                    oldValue = entity;
                }));
            }
            Promise.all(promises).then(() => { resolve({ oldValue, newValue }); }, error => reject(error)).catch(error => reject(error));
        });
    }
    castArrayInstanceInEntity(entity, session, accessorInfo, options) {
        return new Promise((resolve, reject) => {
            let doc = entity.getDocument();
            let persistentMember = accessorInfo.persistentAlias || accessorInfo.name;
            let docsData = doc[persistentMember];
            let promises = new Array();
            let oldValue;
            let newValue;
            if (docsData && docsData.length > 0) {
                let model = session.getModel(this.entityInfo.name);
                newValue = new Array();
                for (let i = 0; i < docsData.length; i++) {
                    let asModel = new model(docsData[i]);
                    promises.push(session.activateEntityInstance(this.entityInfo, asModel).then(entity => newValue.push(entity)));
                }
            }
            if (options && options.oldValue && options.oldValue.length > 0) {
                let model = session.getModel(this.entityInfo.name);
                oldValue = new Array();
                for (let i = 0; i < docsData.length; i++) {
                    let asModel = new model(docsData[i]);
                    promises.push(session.activateEntityInstance(this.entityInfo, asModel).then(entity => oldValue.push(entity)));
                }
            }
            Promise.all(promises).then(() => {
                entity[accessorInfo.name] = newValue;
                resolve({ oldValue, newValue });
            }).catch(error => reject(error));
        });
    }
    //#endregion
    //#region Accessors
    get entityInfo() { return this._entityInfo; }
    get referenceType() { return this.bindingType == hcMetaData_1.MemberBindingType.Reference ? 'string' : null; }
    get defaultSchema() { return null; }
}
exports.EMMemberActivator = EMMemberActivator;
//# sourceMappingURL=emMetadata.js.map