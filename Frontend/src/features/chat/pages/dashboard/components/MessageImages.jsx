import React from 'react'

function MessageImages({ images, pending = false }) {
  return (
    <div className={`dashboard-message__images${pending ? ' dashboard-message__images--pending' : ''}`}>
      {images.map((image, index) => (
        <figure className="dashboard-message__image-card" key={`${image.dataUrl || image.mimeType}-${index}`}>
          <img
            alt={`Generated image ${index + 1}`}
            className="dashboard-message__image"
            loading="lazy"
            src={image.dataUrl}
          />
        </figure>
      ))}
    </div>
  )
}

export default MessageImages
