import 'reflect-metadata';
import { Entity } from '../hcEntity/hcEntity';
import { HcSession } from '../hcSession/hcSession';
declare function DefinedEntity(): any;
declare function DefinedEntity(params: {
    packageName?: string;
    abstract?: boolean;
}): any;
declare function DefinedAccessor(params?: {
    exposed?: boolean;
    schema?: any;
    persistenceType?: PersistenceType;
    serializeAlias?: string;
    readOnly?: boolean;
    activator?: MemberActivator;
}): (target: any, key: string, descriptor: PropertyDescriptor) => void;
declare function DefinedMethod(): (target: any, key: string, descriptor: PropertyDescriptor) => void;
declare function Defined(...args: any[]): any;
declare class EntityInfo {
    private _packageName;
    private _name;
    private _definedMembers;
    private _base;
    private _isAbstract;
    constructor(name: string);
    addAccessorInfo(accessorInfo: AccessorInfo): void;
    addPropertyInfo(propertyInfo: PropertyInfo): void;
    addMethodInfo(methodInfo: MethodInfo): void;
    getAllMembers(): Array<MemberInfo>;
    getAccessors(): Array<AccessorInfo>;
    getAccessorSchemas(): Array<{
        accessorName: string;
        accessorSchema: any;
    }>;
    getCompleteSchema(): any;
    implementBaseInfo(baseInfo: EntityInfo): void;
    implementBaseInfo(baseInfo: EntityInfo, isAbstract: boolean): void;
    static implementAbstractInfo(info: EntityInfo): void;
    name: string;
    packageName: string;
    readonly base: EntityInfo;
    readonly isAbstract: boolean;
}
declare abstract class MemberActivator {
    private _entityInfo;
    constructor(info: EntityInfo);
    abstract activateMember(entity: Entity, session: HcSession, memberName: string): Promise<void>;
    protected readonly entityInfo: EntityInfo;
}
declare abstract class MemberInfo {
    private _name;
    private _className;
    private _packageName;
    private _type;
    constructor();
    name: string;
    className: string;
    packageName: string;
    type: string;
}
declare class PropertyInfo extends MemberInfo {
    constructor();
}
declare class AccessorInfo extends MemberInfo {
    private _exposed;
    private _schema;
    private _persistenceType;
    private _serializetAlias;
    private _readOnly;
    private _activator;
    constructor();
    exposed: boolean;
    schema: any;
    persistenceType: PersistenceType;
    serializeAlias: string;
    readOnly: boolean;
    activator: MemberActivator;
}
declare class MethodInfo extends MemberInfo {
    constructor();
}
interface IMetaDataInfo {
    entityInfo: EntityInfo;
}
declare enum PersistenceType {
    Defined = 1,
    Auto = 2
}
export { EntityInfo, Defined, DefinedAccessor, DefinedEntity, DefinedMethod, IMetaDataInfo, PersistenceType, AccessorInfo, MemberInfo, MethodInfo, PropertyInfo, MemberActivator };
