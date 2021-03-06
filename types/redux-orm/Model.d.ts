import { ModelTableOpts, TableOpts } from './db';
import { IdAttribute } from './db/Table';
import { AttributeWithDefault, FieldSpecMap, ForeignKey, ManyToMany, OneToOne } from './fields';
import { Optional, OptionalKeys, Overwrite, PickByValue } from './helpers';
import { IdOrModelLike, ModelField } from './index';
import QuerySet, { LookupSpec, MutableQuerySet, SortIteratee, SortOrder } from './QuerySet';
import { OrmSession } from './Session';

/**
 * A primitive value
 */
export type Primitive = number | string | boolean;

/**
 * Serializable value: a primitive, undefined, a serializable object or an array of those
 */
export type Serializable =
    | Primitive
    | Primitive[]
    | undefined
    | {
          [K: string]: Serializable | Serializable[];
      };

/**
 * Object restricted to serializable properties only
 */
export interface SerializableMap {
    [K: string]: Serializable | Serializable[];
}

/**
 * A union of supported model field types
 *
 * Specify foreign key and one-to-one association properties as Model typed properties.
 *
 * Specify many-to-many and reverse-fk associations as related Model's specification of:
 * - {@link MutableQuerySet} - for many-to-many relations
 * - {@link QuerySet} - for reverse side of foreign keys
 */
export type ModelField = MutableQuerySet | QuerySet | SessionBoundModel | Serializable;

/**
 * Map of fields restriction to supported field types.
 */
export interface ModelFieldMap {
    [K: string]: ModelField;
}

/**
 * A Model-derived mapped type for supplying relations and alike.
 *
 * Either a primitive type matching Model's identifier type or a map containing an {IdAttribute: IdType} pair,
 * where IdAttribute and IdType match respective Model property key and type
 */
export type IdOrModelLike<M extends Model> = IdType<M> | IdEntry<M>;

/**
 * The heart of an ORM, the data model.
 *
 * The fields you specify to the Model will be used to generate
 * a schema to the database, related property accessors, and
 * possibly through models.
 *
 * In each {@link Session} you instantiate from an {@link ORM} instance,
 * you will receive a session-specific subclass of this Model. The methods
 * you define here will be available to you in sessions.
 *
 * An instance of {@link Model} represents a record in the database, though
 * it is possible to generate multiple instances from the same record in the database.
 *
 * To create data models in your schema, subclass {@link Model}. To define
 * information about the data model, override static class methods. Define instance
 * logic by defining prototype methods (without `static` keyword).
 * @borrows {@link QuerySet.filter} as Model#filter
 */
export default class Model<MClass extends typeof AnyModel = any, Fields extends ModelFieldMap = any> {
    /**
     * A string constant identifying specific Model, necessary to retain the shape of state and relations through transpilation steps
     */
    static modelName: string;

    /**
     * Model field descriptors.
     * @see {@link Attribute}
     * @see {@link OneToOne}
     * @see {@link ForeignKey}
     * @see {@link ManyToMany}
     */
    static fields: FieldSpecMap;

    /**
     * Returns the options object passed to the database for the table that represents
     * this Model class.
     *
     * Returns an empty object by default, which means the database
     * will use default options. You can either override this function to return the options
     * you want to use, or assign the options object as a static property of the same name to the
     * Model class.
     *
     * @return the options object passed to the database for the table
     *                  representing this Model class.
     */
    static options: { (): TableOpts } | TableOpts;

    /**
     * The key of Model's identifier property
     */
    static readonly idAttribute: string;
    /**
     * {@link QuerySet} class associated with this Model class.
     *
     * Defaults to base {@link QuerySet}
     */
    static querySetClass: typeof QuerySet;

    /**
     * @see {@link Model.getQuerySet}
     */
    static readonly query: QuerySet;
    /**
     * Returns a reference to the plain JS object in the store.
     * Make sure to not mutate this.
     *
     * @return a reference to the plain JS object in the store
     */
    readonly ref: Ref<InstanceType<MClass>>;

    /**
     * Creates a Model instance from it's properties.
     * Don't use this to create a new record; Use the static method {@link Model#create}.
     * @param props - the properties to instantiate with
     */
    constructor(props: Fields);

    /**
     * Model specific reducer function.
     *
     * An alternative to standalone reducer function.
     *
     * @see {@link createReducer}
     *
     * @param action  - store-dispatched action instance
     * @param modelType - a {@link ModelType} parametrized with a
     *                      {@link Model} type that the reducer is being attached to.
     * @param session - an optional parameter, can be used for querying other Models (mutations are not supported)
     */
    static reducer(action: any, modelType: ModelType<any>, session: OrmSession<any>): void;

    /**
     * Creates a new record in the database, instantiates a {@link Model} and returns it.
     *
     * If you pass values for many-to-many fields, instances are created on the through
     * model as well.
     *
     * @param  userProps - the new {@link Model}'s properties.
     * @return a new {@link SessionBoundModel} instance.
     */
    static create<M extends AnyModel, TProps extends CreateProps<M>>(userProps: TProps): SessionBoundModel<M, TProps>;

    /**
     * Creates a new or update existing record in the database, instantiates a {@link Model} and returns it.
     *
     * If you pass values for many-to-many fields, instances are created on the through
     * model as well.
     *
     * @param  userProps - the upserted {@link Model}'s properties.
     * @return a {@link SessionBoundModel} instance.
     */
    static upsert<M extends AnyModel, TProps extends UpsertProps<M>>(userProps: TProps): SessionBoundModel<M, TProps>;

    /**
     * Gets the {@link Model} instance that matches properties in `lookupObj`.
     * Throws an error if {@link Model} if multiple records match
     * the properties.
     *
     * @param  lookupObj - the properties used to match a single entity.
     * @throws {Error} If more than one entity matches the properties in `lookupObj`.
     * @return a {@link SessionBoundModel} instance that matches the properties in `lookupObj`.
     */
    static get<M extends AnyModel, TProps extends LookupSpec<M>>(
        lookupObj: TProps
    ): SessionBoundModel<M, TProps> | null;

    /**
     * Returns a {@link Model} instance for the object with id `id`.
     * Returns `null` if the model has no instance with id `id`.
     *
     * You can use {@link Model#idExists} to check for existence instead.
     *
     * @param  id - the `id` of the object to get
     * @return a {@link SessionBoundModel} instance with id `id`
     */
    static withId<M extends AnyModel>(id: IdType<M>): SessionBoundModel<M> | null;

    /**
     * Returns a boolean indicating if an entity
     * with the id `id` exists in the state.
     *
     * @param   id - a value corresponding to the id attribute of the {@link Model} class.
     * @return a boolean indicating if entity with `id` exists in the state
     *
     * @since 0.11.0
     */
    static idExists(id: string | number): boolean;

    /**
     * @return A string representation of this {@link Model} class.
     */
    static toString(): string;

    /**
     * Manually mark individual instances as accessed.
     * This allows invalidating selector memoization within mutable sessions.
     *
     * @param ids - Array of primary key values
     */
    static markAccessed(ids: Array<string | number>): void;

    /**
     * Manually mark this model's table as scanned.
     * This allows invalidating selector memoization within mutable sessions.
     *
     */
    static markFullTableScanned(): void;

    /**
     * Returns an instance of the model's `querySetClass` field.
     * By default, this will be an empty {@link QuerySet}.
     *
     * @return An instance of the model's `querySetClass`.
     */
    static getQuerySet(): QuerySet;

    /**
     * @see {@link QuerySet.all}
     */
    static all<M extends AnyModel>(this: ModelType<M>): QuerySet<M>;

    /**
     * @see {@link QuerySet.at}
     */
    static at(index: number): SessionBoundModel | undefined;

    /**
     * @see {@link QuerySet.first}
     */
    static first(): SessionBoundModel | undefined;

    /**
     * @see {@link QuerySet.last}
     */
    static last(): SessionBoundModel | undefined;

    /**
     * @see {@link QuerySet.update}
     */
    static update(props: UpdateProps<Model>): void;

    /**
     * @see {@link QuerySet.filter}
     */
    static filter(props: LookupSpec<Model>): QuerySet;

    /**
     * @see {@link QuerySet.exclude}
     */
    static exclude(props: LookupSpec<Model>): QuerySet;

    /**
     * @see {@link QuerySet.orderBy}
     */
    static orderBy(iteratees: ReadonlyArray<SortIteratee<Model>>, orders?: ReadonlyArray<SortOrder>): QuerySet;

    /**
     * @see {@link QuerySet.count}
     */
    static count(): number;

    /**
     * @see {@link QuerySet.exists}
     */
    static exists(): boolean;

    /**
     * @see {@link QuerySet.delete}
     */
    static delete(): void;

    /**
     * Gets the {@link Model} class or subclass constructor (the class that
     * instantiated this instance).
     *
     * @return The {@link Model} class or subclass constructor used to instantiate
     *                 this instance.
     */
    getClass(): MClass;

    /**
     * Gets the id value of the current instance by looking up the id attribute.
     * @return The id value of the current instance.
     */
    getId(): string | number;

    /**
     * @return A string representation of this {@link Model} instance.
     */
    toString(): string;

    /**
     * Returns a boolean indicating if `otherModel` equals this {@link Model} instance.
     * Equality is determined by shallow comparing their attributes.
     *
     * This equality is used when you call {@link Model#update}.
     * You can prevent model updates by returning `true` here.
     * However, a model will always be updated if its relationships are changed.
     *
     * @param  otherModel - a {@link Model} instance to compare
     * @return a boolean indicating if the {@link Model} instance's are equal.
     */
    equals(otherModel: Model | SessionBoundModel): boolean;

    /**
     * Updates a property name to given value for this {@link Model} instance.
     * The values are immediately committed to the database.
     *
     * @param  propertyName - name of the property to set
     * @param value - value assigned to the property
     */
    set<K extends string>(propertyName: K, value: RefPropOrSimple<InstanceType<MClass>, K>): void;

    /**
     * Assigns multiple fields and corresponding values to this {@link Model} instance.
     * The updates are immediately committed to the database.
     *
     * @param userMergeObj - an object that will be merged with this instance.
     */
    update(userMergeObj: UpdateProps<InstanceType<MClass>>): void;

    /**
     * Updates {@link Model} instance attributes to reflect the
     * database state in the current session.
     */
    refreshFromState(): void;

    /**
     * Deletes the record for this {@link Model} instance.
     * Fields and values on the instance are still accessible after the call.
     */
    delete(): void;
}

/**
 * Model wildcard type.
 */
export class AnyModel extends Model {}

/**
 * {@link Model#upsert} argument type
 *
 * Relations can be provided in a flexible manner for both many-to-many and foreign key associations
 * @see {@link IdOrModelLike}
 */
export type UpsertProps<M extends Model> = Overwrite<Partial<CreateProps<M>>, Required<IdEntry<M>>>;

/**
 * {@link Model#update} argument type
 *
 * All properties are optional.
 * Supplied properties are type-checked against the type of related Model's fields.
 * Relations can be provided in a flexible manner for both many-to-many and foreign key associations
 * @see {@link IdOrModelLike}
 */
export type UpdateProps<M extends Model> = Omit<UpsertProps<M>, IdKey<M>>;

/**
 * @internal
 */
export type CustomInstanceProps<M extends AnyModel, Props extends object> = PickByValue<
    Omit<Props, Extract<keyof Props, keyof ModelFields<M>>>,
    Serializable
>;

/**
 * Model id property key extraction helper.
 *
 * Falls back to `'id'` if not specified explicitly via {@link Model.options}.
 */
export type IdKey<M extends AnyModel> = IdAttribute<ModelClass<M>>;

/**
 * Model id property type extraction helper.
 *
 * Falls back to `number` if not specified explicitly via {@link Model.options}.
 */
export type IdType<M extends Model> = IdKey<M> extends infer U
    ? U extends keyof ModelFields<M>
        ? ModelFields<M>[U] extends string | number
            ? ModelFields<M>[U]
            : never
        : number
    : number;

/**
 * A single entry map representing IdKey: IdType property of supplied {@link Model}.
 */
export type IdEntry<M extends Model> = { [K in IdKey<M>]: IdType<M> };

/**
 * Type of {@link Model.ref} / database entry for a particular Model type
 */
export type Ref<M extends Model> = {
    [K in keyof RefFields<M>]: ModelFields<M>[K] extends AnyModel ? IdType<ModelFields<M>[K]> : RefFields<M>[K]
};

/**
 * A mapped type restricting allowed types of second {@link Model.set} argument.
 * Depending on the first argument `propertyName` argument, value type can be restricted to:
 * - declared Model field type - if propertyName belongs to declared Model fields
 * - any serializable value - if propertyName is not among declared Model fields
 */
export type RefPropOrSimple<M extends Model, K extends string> = K extends keyof RefFields<M>
    ? Ref<M>[K]
    : Serializable;

/**
 * A Model-derived mapped type, representing model instance bound to a session.
 *
 * SessionBoundModels relation properties for convenient association traversal.
 * Custom type-checked properties are available on `SessionBoundModel` instances created using
 * @link Model#create} or {@link Model#upsert} calls.
 */
export type SessionBoundModel<M extends Model = any, InstanceProps extends object = {}> = M &
    { [K in keyof ModelFields<M>]: SessionBoundModelField<M, K> } &
    CustomInstanceProps<M, InstanceProps>;

/**
 * Static side of a particular {@link Model} with member signatures narrowed to provided {@link Model} type
 *
 * @template M a model type narrowing static {@link Model} member signatures.
 *
 * @inheritDoc
 */
export interface ModelType<M extends AnyModel> extends QuerySet<M> {
    new (props: ModelFields<M>): SessionBoundModel<M>;

    options: ModelTableOpts<ModelClass<M>>;

    modelName: ModelClass<M>['modelName'];

    fields: ModelClass<M>['fields'];

    /**
     * @see {@link Model#idExists}
     */
    idExists(id: IdType<M>): boolean;

    /**
     * @see {@link Model#withId}
     */
    withId(id: IdType<M>): SessionBoundModel<M> | null;

    /**
     * @see {@link Model#get}
     */
    get<TLookup extends LookupSpec<M>>(lookupSpec: TLookup): SessionBoundModel<M, TLookup> | null;

    /**
     * @see {@link Model#create}
     */
    create<TProps extends CreateProps<M>>(props: TProps): SessionBoundModel<M, TProps>;

    /**
     * @see {@link Model#upsert}
     */
    upsert<TProps extends UpsertProps<M>>(props: TProps): SessionBoundModel<M, TProps>;
}

/**
 * @internal
 */
export type ModelClass<M extends AnyModel> = ReturnType<M['getClass']>;

/**
 * @internal
 */
export type ModelFields<M extends Model> = [ConstructorParameters<ModelClass<M>>] extends [[infer U]]
    ? U extends ModelFieldMap
        ? U
        : never
    : never;

/**
 * @internal
 */
export type FieldSpecKeys<M extends AnyModel, TField> = keyof PickByValue<ModelClass<M>['fields'], TField>;

/**
 * @internal
 */
export type RefFields<M extends AnyModel, K extends keyof ModelFields<M> = keyof ModelFields<M>> = Omit<
    ModelFields<M>,
    Extract<K, FieldSpecKeys<M, ManyToMany>>
>;

/**
 * @internal
 */
export type SessionBoundModelField<M extends AnyModel, K extends keyof ModelFields<M>> = ModelFields<
    M
>[K] extends AnyModel
    ? SessionBoundModel<ModelFields<M>[K]>
    : ModelFields<M>[K];

/**
 * {@link Model#create} argument type
 *
 * Relations can be provided in a flexible manner for both many-to-many and foreign key associations
 * @see {@link IdOrModelLike}
 */

export type CreateProps<
    M extends AnyModel,
    RFields extends Required<ModelFields<M>> = Required<ModelFields<M>>
> = Optional<
    {
        [K in keyof ModelFields<M>]: {
            [P in K]: RFields[P] extends MutableQuerySet<infer RM>
                ? ReadonlyArray<IdOrModelLike<RM>>
                : (RFields[P] extends QuerySet
                      ? never
                      : RFields[P] extends AnyModel
                      ? (P extends FieldSpecKeys<M, OneToOne | ForeignKey> ? IdOrModelLike<RFields[P]> : never)
                      : RFields[P])
        }[K]
    },
    OptionalCreatePropsKeys<M>
>;

/**
 * @internal
 */
export type OptionalCreatePropsKeys<M extends Model> = IdType<M> extends number
    ? (IdKey<M> | OptionalKeys<ModelFields<M>> | FieldSpecKeys<M, AttributeWithDefault>)
    : (OptionalKeys<ModelFields<M>> | FieldSpecKeys<M, AttributeWithDefault>);
