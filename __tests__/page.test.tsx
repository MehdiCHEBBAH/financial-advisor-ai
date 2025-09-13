import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Home />);

    const heading = screen.getByText('Financial Adviser AI');
    expect(heading).toBeDefined();
  });

  it('renders the description text', () => {
    render(<Home />);

    const description = screen.getByText(
      /Get AI-powered investment advice for any stock of your choice/
    );
    expect(description).toBeDefined();
  });

  it('renders chat UI with proper styling', () => {
    const { container } = render(<Home />);

    const chatContainer = container.querySelector(
      '.flex.flex-col.h-screen.bg-gray-900'
    );
    expect(chatContainer).toBeDefined();
  });
});
