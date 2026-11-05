import { renderInvoiceBody, renderInvoiceHtml, type InvoiceDocument } from '@a2/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

// A4 width at the browser's 96 pixels per inch.
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

// The frame loads once and only its body changes after that, so typing doesn't flash or lose
// the fonts. The same HTML goes to the PDF, and the frame keeps the app's styles out of it.
const SHELL_HTML = renderInvoiceHtml(null);

/** Prints just the invoice, using the same page styles as the PDF. */
export function printInvoicePreview() {
  document.querySelector<HTMLIFrameElement>('iframe[data-invoice-preview]')?.contentWindow?.print();
}

export function InvoicePreview({ document: invoice }: { document: InvoiceDocument }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [pageHeight, setPageHeight] = useState(A4_HEIGHT_PX);
  const [frameReady, setFrameReady] = useState(false);

  const syncFrame = useCallback(() => {
    const body = frameRef.current?.contentDocument?.body;
    if (!body) return;
    body.innerHTML = renderInvoiceBody(invoice);
    setPageHeight(Math.max(A4_HEIGHT_PX, body.scrollHeight));
  }, [invoice]);

  useEffect(() => {
    if (frameReady) syncFrame();
  }, [frameReady, syncFrame]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      // A hidden preview measures zero, so it keeps its last size until it's shown again.
      if (entry.contentRect.width > 0) {
        setScale(Math.min(1, entry.contentRect.width / A4_WIDTH_PX));
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="mx-auto overflow-hidden rounded-lg shadow-card"
        style={{ width: A4_WIDTH_PX * scale, height: pageHeight * scale }}
      >
        <iframe
          ref={frameRef}
          title={`Invoice ${invoice.invoiceNo}`}
          srcDoc={SHELL_HTML}
          data-invoice-preview
          sandbox="allow-same-origin allow-modals"
          onLoad={() => {
            setFrameReady(true);
            syncFrame();
          }}
          className="origin-top-left border-0 bg-white"
          style={{
            width: A4_WIDTH_PX,
            height: pageHeight,
            transform: `scale(${scale})`,
          }}
        />
      </div>
    </div>
  );
}
