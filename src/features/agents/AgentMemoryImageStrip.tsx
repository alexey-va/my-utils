import type { AgentMemoryMessage } from "../../api/agentMemory";

type Props = {
  images: string[];
  className?: string;
};

export default function AgentMemoryImageStrip({ images, className }: Props) {
  if (images.length === 0) {
    return null;
  }

  const rootClass = className
    ? `agent-memory__images ${className}`
    : "agent-memory__images";

  return (
    <div className={rootClass}>
      {images.map((src, index) => (
        <a
          key={`${index}-${src.slice(0, 32)}`}
          className="agent-memory__image-link"
          href={src}
          target="_blank"
          rel="noreferrer"
        >
          <img className="agent-memory__image" src={src} alt={`Attachment ${index + 1}`} loading="lazy" />
        </a>
      ))}
    </div>
  );
}

export function messageImages(row: AgentMemoryMessage, parsedImages?: string[]): string[] {
  if (parsedImages && parsedImages.length > 0) {
    return parsedImages;
  }
  return row.images ?? [];
}
