export class SendSmsDto {
  to!: string; // E.164 ej: +614xxxxxxxx
  text!: string; // texto plano
}
