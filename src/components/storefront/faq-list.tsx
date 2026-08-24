type FaqItem = {
  question: string;
  answer: string;
  area?: string;
};

export function FaqList({ faqs, className = "mx-auto mt-10 grid max-w-4xl gap-3" }: { faqs: FaqItem[]; className?: string }) {
  return (
    <div className={className}>
      {faqs.map((faq) => (
        <details key={`${faq.area ?? "faq"}-${faq.question}`} className="rounded-[22px] border border-line bg-white p-6 shadow-sm">
          <summary className="cursor-pointer text-lg font-semibold text-ink">{faq.question}</summary>
          <p className="mt-4 leading-7 text-muted">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
