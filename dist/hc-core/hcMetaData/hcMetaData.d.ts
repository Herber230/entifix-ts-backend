import 'reflect-metadata';
import { Entity } from '../hcEntity/hcEntity';
import { HcSession } from '../hcSession/hcSession';
declare function DefinedEntity(): any;
declare function DefinedEntity(params: {
    packageName?: string;
    abstract?: boolean;
    fixedSystemOwner?: string;
}): any;
declare function DefinedAccessor(params?: {
    exposition?: ExpositionType;
    schema?: any;
    persistenceType?: PersistenceType;
    alias?: string;
    serializeAlias?: string;
    persistentAlias?: string;
    activator?: MemberActivator;
}): (target: any, key: string, descriptor: PropertyDescriptor) => void;
interface DefinedMetaParam {
    name: string;
    index: number;
    required?: boolean;
    special?: boolean;
}
declare function DefinedParam(paramName: string, required?: boolean): (target: Object, propertyKey: string | symbol, parameterIndex: number) => void;
declare function SessionParam(): (target: Object, propertyKey: string | symbol, parameterIndex: number) => void;
declare function DefinedMethod(params?: {
    eventName?: string;
}): (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<Function>) => void;
declare class EntityInfo {
    private _packageName;
    private _name;
    private _definedMembers;
    private _base;
    private _isAbstract;
    private _fixedSystemOwner;
    constructor(name: string);
    constructor(name: string, options: {
        fixedSystemOwner?: string;
    });
    addAccessorInfo(accessorInfo: AccessorInfo): void;
    addPropertyInfo(propertyInfo: PropertyInfo): void;
    addMethodInfo(methodInfo: MethodInfo): void;
    getAllMembers(): Array<MemberInfo>;
    getAccessors(): Array<AccessorInfo>;
    getDefinedMethods(): Array<MethodInfo>;
    getAccessorSchemas(): Array<{
        accessorName: string;
        accessorSchema: any;
        alias?: string;
    }>;
    getCompleteSchema(): any;
    implementBaseInfo(baseInfo: EntityInfo): void;
    implementBaseInfo(baseInfo: EntityInfo, isAbstract: boolean): void;
    static implementAbstractInfo(info: EntityInfo): void;
    name: string;
    packageName: string;
    readonly base: EntityInfo;
    readonly isAbstract: boolean;
    readonly fixedSystemOwner: string;
}
declare abstract class MemberActivator {
    private _bindingType;
    private _resourcePath;
    private _extendRoute;
    constructor(bindingType: MemberBindingType, extendedRoute: boolean, resourcePath: string);
    abstract activateMember(entity: Entity, session: HcSession, accessorInfo: AccessorInfo, options?: {
        oldValue?: any;
    }): Promise<{
        oldValue?: any;
        newValue: any;
    }>;
    readonly bindingType: MemberBindingType;
    readonly resourcePath: string;
    readonly extendRoute: boolean;
    abstract readonly referenceType: string;
    abstract readonly defaultSchema: any;
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
    private _exposition;
    private _schema;
    private _persistenceType;
    private _serializeAlias;
    private _activator;
    private _persistentAlias;
    constructor();
    setAlias(alias: string): void;
    exposition: ExpositionType;
    schema: any;
    persistenceType: PersistenceType;
    serializeAlias: string;
    persistentAlias: string;
    activator: MemberActivator;
}
declare class MethodInfo extends MemberInfo {
    private _parameters;
    private _eventName;
    constructor();
    parameters: DefinedMetaParam[];
    eventName: string;
}
interface IMetaDataInfo {
    entityInfo: EntityInfo;
}
declare enum PersistenceType {
    Defined = 1,
    Auto = 2
}
declare enum ExpositionType {
    Normal = "normal",
    ReadOnly = "readOnly"
}
declare enum MemberBindingType {
    Reference = 1,
    Snapshot = 2,
    Chunks = 3
}
export { MemberBindingType, ExpositionType, EntityInfo, DefinedAccessor, DefinedEntity, DefinedMethod, DefinedParam, SessionParam, IMetaDataInfo, PersistenceType, AccessorInfo, MemberInfo, MethodInfo, PropertyInfo, MemberActivator };
