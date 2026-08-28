type FaqItem = {
  question: string;
  answer: string;
  area?: string;
};

export function FaqList({ faqs, className = "mx-auto mt-10 grid max-w-4xl gap-3" }: { faqs: FaqItem[]; className?: string }) {
  return (
    <div className={className}>
      {faqs.map((faq) => (
        <details key={`${faq.area ?? "faq"}-${faq.question}`} className="tr-card group p-5 sm:p-6">
          <summary className="cursor-pointer list-none text-base font-semibold leading-snug text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 sm:text-lg">
            <span className="flex items-start justify-between gap-4">
              <span>{faq.question}</span>
              <span className="mt-1 text-brand transition group-open:rotate-45" aria-hidden="true">+</span>
            </span>
          </summary>
          <p className="tr-body mt-4">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
