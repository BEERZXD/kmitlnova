import { useEffect, useState } from 'react';

export function WarningModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastDismissedDate = localStorage.getItem('kmitlnova-warning-dismissed-date');
    const today = new Date().toDateString();
    
    if (lastDismissedDate !== today) {
      setIsOpen(true);
    }
  }, []);

  if (!isOpen) return null;

  function handleClose() {
    const today = new Date().toDateString();
    localStorage.setItem('kmitlnova-warning-dismissed-date', today);
    setIsOpen(false);
  }

  return (
    <div className="warning-modal-overlay">
      <div className="warning-modal-content">
        <div className="warning-modal-icon">⚠️</div>
        <h2 className="warning-modal-title">KMITLNova</h2>
        <div className="warning-modal-text">
          <p>เป็นเพียงเว็ปไซต์ดูข้อมูลการเรียนอย่างไม่เป็นทางการ</p>
          <p>ควรตรวจสอบข้อมูลโดยตรงจากมหาวิทยาลัยทุกครั้ง</p>
          <p>
            หากพบเจอปัญหาสามารถแจ้งได้ที่ IG:{' '}
            <a href="https://www.instagram.com/_bxxr.t/" target="_blank" rel="noreferrer" className="warning-modal-link">
              _bxxr.t
            </a>
          </p>
        </div>
        <button type="button" className="warning-modal-button" onClick={handleClose}>
          รับทราบ
        </button>
      </div>
    </div>
  );
}
