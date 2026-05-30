import { Link } from 'react-router-dom';
import { Row, Col, Divider, Tooltip } from 'antd';
import { YoutubeOutlined, MailOutlined } from '@ant-design/icons';
import { SapttaLogo } from './Navbar';

const hrmsLinks = [
  { label: 'Employee Management', to: '/hrms' },
  { label: 'Attendance Tracking', to: '/hrms' },
  { label: 'Leave Management', to: '/hrms' },
  { label: 'Payroll Processing', to: '/hrms' },
  { label: 'Recruitment & ATS', to: '/hrms' },
  { label: 'Performance Reviews', to: '/hrms' },
];

const accountsLinks = [
  { label: 'GST Invoicing', to: '/accounts' },
  { label: 'General Ledger', to: '/accounts' },
  { label: 'Bank Reconciliation', to: '/accounts' },
  { label: 'Inventory Management', to: '/accounts' },
  { label: 'Financial Reports', to: '/accounts' },
  { label: 'Multi-Business Support', to: '/accounts' },
];

const companyLinks = [
  { label: 'About Us', to: '/about' },
  { label: 'Features', to: '/features' },
  { label: 'Industries', to: '/industries' },
  { label: 'Mobile App', to: '/mobile-app' },
  { label: 'Contact Us', to: '/contact' },
];

const socialLinks = [
  { icon: YoutubeOutlined, label: 'YouTube', url: 'https://youtube.com/@sappta', color: '#FF0000' },
  { icon: MailOutlined, label: 'Email', url: 'mailto:info@saptta.com', color: '#FF6D00' },
];

const linkStyle: React.CSSProperties = {
  color: 'rgba(10, 17, 40, 0.65)',
  fontSize: 13.5,
  lineHeight: 2.1,
  display: 'block',
  textDecoration: 'none',
  transition: 'color 0.15s',
};

const headStyle: React.CSSProperties = {
  color: '#0A1128',
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  marginBottom: 18,
};

export default function Footer() {
  return (
    <footer style={{
      background: '#F4F5F8',
      borderTop: '1px solid #EAECEF',
    }}>
      {/* Top bar */}
      <div style={{
        height: 3,
        background: 'linear-gradient(90deg, transparent, #FF6D00, transparent)',
        opacity: 0.7,
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px 24px' }}>
        <Row gutter={[48, 40]}>
          {/* Brand */}
          <Col xs={24} sm={24} md={8} lg={7}>
            <div style={{ marginBottom: 16 }}>
              <SapttaLogo />
            </div>
            <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 13.5, lineHeight: 1.75, marginBottom: 20 }}>
              Smart HR. Smarter Accounts. Better Business.<br/>
              One platform for complete HR & Finance — built for Indian businesses.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
              {[
                { label: 'EMAIL', val: 'info@saptta.com' },
                { label: 'WHATSAPP', val: 'Active Support' },
                { label: 'LOCATION', val: 'India' },
              ].map(item => (
                <span key={item.val} style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#FF6D00', letterSpacing: '0.5px', fontSize: 11 }}>{item.label}:</strong>
                  {item.val}
                </span>
              ))}
            </div>
            {/* Social Icons */}
            <div style={{ display: 'flex', gap: 12 }}>
              {socialLinks.map(social => {
                const IconComponent = social.icon;
                return (
                  <Tooltip key={social.label} title={social.label} color="#0A1128">
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: '1px solid #EAECEF',
                        color: social.color,
                        fontSize: 16,
                        transition: 'all 0.2s ease',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${social.color}15`;
                        e.currentTarget.style.borderColor = social.color;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = '#EAECEF';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <IconComponent />
                    </a>
                  </Tooltip>
                );
              })}
            </div>
          </Col>

          <Col xs={12} sm={8} md={5} lg={5}>
            <div style={headStyle}>HRMS</div>
            {hrmsLinks.map(l => <Link key={l.label} to={l.to} style={linkStyle}>{l.label}</Link>)}
          </Col>

          <Col xs={12} sm={8} md={5} lg={5}>
            <div style={headStyle}>Accounts</div>
            {accountsLinks.map(l => <Link key={l.label} to={l.to} style={linkStyle}>{l.label}</Link>)}
          </Col>

          <Col xs={12} sm={8} md={5} lg={4}>
            <div style={headStyle}>Company</div>
            {companyLinks.map(l => <Link key={l.label} to={l.to} style={linkStyle}>{l.label}</Link>)}
          </Col>
        </Row>

        <Divider style={{ borderColor: '#EAECEF', margin: '40px 0 20px' }} />

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ color: 'rgba(10, 17, 40, 0.45)', fontSize: 13 }}>
            © {new Date().getFullYear()} SAPTTA TECH SOLUTIONS. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map(t => (
              <span key={t} style={{ color: 'rgba(10, 17, 40, 0.45)', fontSize: 13, cursor: 'pointer' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
