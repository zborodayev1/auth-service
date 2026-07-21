import { Identifiable } from './Identifiable'

export abstract class Entity<T = string> extends Identifiable<T> {}
