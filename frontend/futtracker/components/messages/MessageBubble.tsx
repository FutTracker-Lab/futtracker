import { timeLabel } from "@/lib/format/messageLabels";

type Props = {
  body: string;
  createdAt: string;
  mine: boolean;
};

// Texto plano siempre: React escapa el contenido, así que `<b>hola</b>` se ve
// literal. `whitespace-pre-wrap` respeta los saltos de línea (requisito 5).
export default function MessageBubble({ body, createdAt, mine }: Props) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          mine
            ? "rounded-br-sm bg-brand text-brand-foreground"
            : "rounded-bl-sm border border-zinc-200 bg-white text-zinc-900"
        }`}
      >
        <p className="break-words whitespace-pre-wrap">{body}</p>
        <time
          dateTime={createdAt}
          className={`mt-1 block text-right text-[11px] ${mine ? "text-brand-foreground/80" : "text-zinc-500"}`}
        >
          {timeLabel(createdAt)}
        </time>
      </div>
    </div>
  );
}
