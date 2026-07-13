export class CreateProjectCommand {
  constructor(
    public readonly name: string,
    public readonly ownerId: string,
  ) {}
}
