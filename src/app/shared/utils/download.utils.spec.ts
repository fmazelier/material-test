import { triggerDownload } from './download.utils';

describe('triggerDownload', () => {
  let clickSpy: ReturnType<typeof vi.fn<() => void>>;
  let anchorElement: HTMLAnchorElement;

  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    clickSpy = vi.fn();
    anchorElement = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchorElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create an object URL from the blob', () => {
    const blob = new Blob(['content'], { type: 'application/pdf' });
    triggerDownload(blob, 'file.pdf');

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('should set href and download on the anchor element', () => {
    const blob = new Blob(['content']);
    triggerDownload(blob, 'report.csv');

    expect(anchorElement.href).toBe('blob:mock-url');
    expect(anchorElement.download).toBe('report.csv');
  });

  it('should programmatically click the anchor', () => {
    const blob = new Blob(['content']);
    triggerDownload(blob, 'file.txt');

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('should revoke the object URL after clicking', () => {
    const blob = new Blob(['content']);
    triggerDownload(blob, 'file.txt');

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should create an anchor element', () => {
    const blob = new Blob(['content']);
    triggerDownload(blob, 'file.txt');

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});
