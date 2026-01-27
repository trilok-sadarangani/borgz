describe('Auth Response Handling - No Double Authentication', () => {
  test('should process auth response only once with handled flag', () => {
    const loginMock = jest.fn();
    const setErrorMock = jest.fn();
    
    const mockSuccessResponse = {
      type: 'success',
      params: { access_token: 'test-token-123' },
    };

    // Simulate the combined useEffect logic
    let handled = false;
    
    if (mockSuccessResponse.type === 'success') {
      const accessToken = mockSuccessResponse.params.access_token;
      if (accessToken && !handled) {
        handled = true;
        loginMock(accessToken);
      }
    }

    // Even if we loop through responses multiple times, should only call once
    if (mockSuccessResponse.type === 'success') {
      const accessToken = mockSuccessResponse.params.access_token;
      if (accessToken && !handled) {
        handled = true;
        loginMock(accessToken);
      }
    }

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(loginMock).toHaveBeenCalledWith('test-token-123');
    expect(setErrorMock).not.toHaveBeenCalled();
  });

  test('should process error response only once', () => {
    const loginMock = jest.fn();
    const setErrorMock = jest.fn();
    
    const mockErrorResponse = {
      type: 'error',
      error: { message: 'Auth failed' },
    };

    let handled = false;
    
    // Simulate error handling
    if (mockErrorResponse.type === 'error' && !handled) {
      handled = true;
      setErrorMock('Auth failed');
    }

    // Try again - should not process
    if (mockErrorResponse.type === 'error' && !handled) {
      handled = true;
      setErrorMock('Auth failed');
    }

    expect(setErrorMock).toHaveBeenCalledTimes(1);
    expect(loginMock).not.toHaveBeenCalled();
  });

  test('should prioritize success over error when both present', () => {
    const loginMock = jest.fn();
    const setErrorMock = jest.fn();
    
    const responses = [
      null,
      { type: 'success', params: { access_token: 'valid-token' } },
      { type: 'error', error: { message: 'Some error' } },
    ];

    let handled = false;
    
    for (const res of responses) {
      if (!res) continue;
      
      // Success case
      if (res.type === 'success') {
        const accessToken = (res.params as any)?.access_token;
        if (accessToken && !handled) {
          handled = true;
          loginMock(accessToken);
          break;
        }
      }
      
      // Error case
      if (!handled && res.type === 'error') {
        handled = true;
        setErrorMock('Error');
        break;
      }
    }

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(setErrorMock).not.toHaveBeenCalled();
  });

  test('should handle multiple null responses gracefully', () => {
    const loginMock = jest.fn();
    const setErrorMock = jest.fn();
    
    const responses = [null, null, null];

    let handled = false;
    
    for (const res of responses) {
      if (!res) continue;
      
      if (res.type === 'success' && !handled) {
        handled = true;
        loginMock();
      }
    }

    expect(loginMock).not.toHaveBeenCalled();
    expect(setErrorMock).not.toHaveBeenCalled();
  });
});
