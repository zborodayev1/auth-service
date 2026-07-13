import { Identifiable } from './Identifiable'

export interface DomainEvent {
  readonly eventName: string
  readonly occurredAt: Date
}

export class AggregateRoot<T = string> extends Identifiable<T> {
  protected _events: DomainEvent[] = []

  get events(): readonly DomainEvent[] {
    return this._events
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._events.push(event)
  }

  clearDomainEvents(): void {
    this._events = []
  }
}
