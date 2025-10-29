
from django.db import models
import uuid

class VerificationJob(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    document_hash = models.CharField(max_length=64)
    file_path = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    confidence_score = models.FloatField(null=True, blank=True)
    analysis_results = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

# verification/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import VerificationJob
from .ml_models.forgery_detector import ForgeryDetector
from celery import current_app

class DocumentVerificationView(APIView):
    def post(self, request):
        # File upload handling
        uploaded_file = request.FILES.get('document')
        if not uploaded_file:
            return Response({'error': 'No document provided'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Create verification job
        job = VerificationJob.objects.create(
            document_hash=self.calculate_hash(uploaded_file),
            file_path=self.save_file(uploaded_file),
            status='pending'
        )
        
        # Queue for processing
        from .tasks import process_document_verification
        process_document_verification.delay(str(job.id))
        
        return Response({
            'verification_id': str(job.id),
            'status': job.status
        })
    
    def get(self, request, verification_id):
        try:
            job = VerificationJob.objects.get(id=verification_id)
            return Response({
                'verification_id': str(job.id),
                'status': job.status,
                'confidence_score': job.confidence_score,
                'analysis_results': job.analysis_results
            })
        except VerificationJob.DoesNotExist:
            return Response({'error': 'Verification job not found'}, 
                          status=status.HTTP_404_NOT_FOUND)