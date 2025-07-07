import React, { useState } from 'react';
import FeedbackButton from './FeedbackButton';
import FeedbackModal from './FeedbackModal';

/**
 * FeedbackSystem component that combines the floating feedback button and modal
 * @returns {JSX.Element}
 */
const FeedbackSystem = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <FeedbackButton onClick={openModal} />
      <FeedbackModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
};

export default FeedbackSystem; 