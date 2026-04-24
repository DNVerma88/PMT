import { uiReducer, showNotification, dismissNotification, setSessionExpiring } from '../../../app/uiSlice';

describe('uiSlice', () => {
  const initialState = {
    themeMode: 'light' as const,
    sidebarOpen: true,
    notifications: [],
    sessionExpiring: false,
  };

  it('showNotification adds a notification', () => {
    const state = uiReducer(
      initialState,
      showNotification({ message: 'Test message', severity: 'success' }),
    );
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].message).toBe('Test message');
    expect(state.notifications[0].severity).toBe('success');
  });

  it('dismissNotification removes notification by id', () => {
    const withNotif = uiReducer(
      initialState,
      showNotification({ message: 'Remove me', severity: 'info' }),
    );
    const id = withNotif.notifications[0].id;
    const final = uiReducer(withNotif, dismissNotification(id));
    expect(final.notifications).toHaveLength(0);
  });

  it('setSessionExpiring sets the sessionExpiring flag', () => {
    const state = uiReducer(initialState, setSessionExpiring(true));
    expect(state.sessionExpiring).toBe(true);
  });

  it('caps notifications at 5 entries', () => {
    let state = initialState;
    for (let i = 0; i < 7; i++) {
      state = uiReducer(state, showNotification({ message: `msg${i}` }));
    }
    expect(state.notifications).toHaveLength(5);
  });
});
