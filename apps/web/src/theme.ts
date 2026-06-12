import { theme as antTheme } from 'antd';
import type { ThemeConfig } from 'antd';

export const getAntTheme = (isDark: boolean): ThemeConfig => {
  return {
    algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#FF6D00',
      colorSuccess: '#10B981',
      colorWarning: '#FF9800',
      colorLink: '#FF6D00',
      colorLinkHover: '#FF9100',
      colorBgBase: isDark ? '#0A0A0C' : '#FAFAFC',
      colorBgContainer: isDark ? '#121215' : '#FFFFFF',
      colorBgElevated: isDark ? '#18181C' : '#FFFFFF',
      colorBorder: isDark ? '#1F2937' : '#EAECEF',
      colorBorderSecondary: isDark ? '#121215' : '#F1F3F5',
      colorText: isDark ? '#FAFAFA' : '#0A1128',
      colorTextSecondary: isDark ? 'rgba(250, 250, 250, 0.75)' : 'rgba(10, 17, 40, 0.65)',
      colorTextTertiary: isDark ? 'rgba(250, 250, 250, 0.45)' : 'rgba(10, 17, 40, 0.45)',
      borderRadius: 8,
      borderRadiusLG: 12,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 15,
      boxShadow: isDark ? '0 4px 32px rgba(0, 0, 0, 0.4)' : '0 4px 32px rgba(10, 17, 40, 0.05)',
      boxShadowSecondary: isDark ? '0 2px 16px rgba(0, 0, 0, 0.25)' : '0 2px 16px rgba(10, 17, 40, 0.03)',
    },
    components: {
      Button: {
        colorPrimary: '#FF6D00',
        colorPrimaryHover: '#FF8F00',
        colorPrimaryActive: '#E65100',
        algorithm: true,
      },
      Menu: {
        colorBgContainer: 'transparent',
        itemColor: isDark ? '#FAFAFA' : '#0A1128',
        itemHoverColor: '#FF6D00',
        itemSelectedColor: '#FF6D00',
        itemSelectedBg: 'rgba(255, 109, 0, 0.08)',
        horizontalItemSelectedColor: '#FF6D00',
      },
      Card: {
        colorBgContainer: isDark ? '#121215' : '#FFFFFF',
        colorBorder: isDark ? '#1F2937' : '#EAECEF',
        boxShadowTertiary: isDark ? '0 4px 24px rgba(0, 0, 0, 0.3)' : '0 4px 24px rgba(10, 17, 40, 0.04)',
      },
      Table: {
        colorBgContainer: isDark ? '#121215' : '#FFFFFF',
        headerBg: isDark ? '#0A0A0C' : '#FAFAFC',
        headerColor: isDark ? '#FAFAFA' : '#0A1128',
        borderColor: isDark ? '#1F2937' : '#EAECEF',
        rowHoverBg: isDark ? '#1C1C1E' : '#F8F9FA',
      },
      Input: {
        colorBgContainer: isDark ? '#0A0A0C' : '#FFFFFF',
        colorBorder: isDark ? '#1F2937' : '#EAECEF',
        colorText: isDark ? '#FAFAFA' : '#0A1128',
        colorTextPlaceholder: isDark ? 'rgba(250, 250, 250, 0.35)' : 'rgba(10, 17, 40, 0.35)',
        activeBorderColor: '#FF6D00',
        hoverBorderColor: '#FF6D00',
      },
      Select: {
        colorBgContainer: isDark ? '#0A0A0C' : '#FFFFFF',
        colorBorder: isDark ? '#1F2937' : '#EAECEF',
        colorText: isDark ? '#FAFAFA' : '#0A1128',
        optionSelectedBg: 'rgba(255, 109, 0, 0.08)',
      },
      Form: {
        labelColor: isDark ? '#FAFAFA' : '#0A1128',
      },
      Divider: {
        colorSplit: isDark ? '#1F2937' : '#EAECEF',
      },
      Tag: {
        colorBgContainer: 'transparent',
      },
      Drawer: {
        colorBgElevated: isDark ? '#121215' : '#FAFAFC',
      },
      Modal: {
        contentBg: isDark ? '#121215' : '#FFFFFF',
        headerBg: isDark ? '#121215' : '#FFFFFF',
      },
    },
  };
};

const theme = getAntTheme(false);
export default theme;
