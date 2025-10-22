# verification/tasks.py
from celery import shared_task
from .models import VerificationJob
from .ml_models.forgery_detector import ForgeryDetector
from django.utils import timezone

@shared_task
def process_document_verification(job_id):
    try:
        job = VerificationJob.objects.get(id=job_id)
        job.status = 'processing'
        job.save()
        
        detector = ForgeryDetector()
        results = detector.detect_forgery(job.file_path)
        
        job.confidence_score = results['confidence_score']
        job.analysis_results = results
        job.status = 'completed'
        job.completed_at = timezone.now()
        job.save()
        
    except Exception as e:
        job.status = 'failed'
        job.analysis_results = {'error': str(e)}
        job.save()