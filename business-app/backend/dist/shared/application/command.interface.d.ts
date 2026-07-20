export interface Command {
}
export interface CommandHandler<TCommand extends Command, TResponse = void> {
    execute(command: TCommand): Promise<TResponse>;
}
