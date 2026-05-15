import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';

import { CustomTitleStrategyService } from './custom-title-strategy.service';

describe('CustomTitleStrategyService', () => {
  let strategy: CustomTitleStrategyService;
  let titleService: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CustomTitleStrategyService, Title],
    });

    strategy = TestBed.inject(CustomTitleStrategyService);
    titleService = TestBed.inject(Title);
    vi.spyOn(titleService, 'setTitle');
  });

  it('should set title with prefix when route has a title', () => {
    vi.spyOn(strategy, 'buildTitle').mockReturnValue('Dashboard');

    strategy.updateTitle({} as RouterStateSnapshot);

    expect(titleService.setTitle).toHaveBeenCalledWith('Material-test - Dashboard');
  });

  it('should set default title when route has no title', () => {
    vi.spyOn(strategy, 'buildTitle').mockReturnValue(undefined);

    strategy.updateTitle({} as RouterStateSnapshot);

    expect(titleService.setTitle).toHaveBeenCalledWith('Material-test');
  });

  it('should set default title when buildTitle returns empty string', () => {
    vi.spyOn(strategy, 'buildTitle').mockReturnValue('');

    strategy.updateTitle({} as RouterStateSnapshot);

    expect(titleService.setTitle).toHaveBeenCalledWith('Material-test');
  });
});
