# SignalScope ML Model Directory

This directory contains the machine learning training scripts, evaluation benchmarks, and inference pipelines for the SignalScope AI-Generated Image Detector.

## Contents
- `predict.py`: Inference interface wrapper class for preprocessing images and evaluating trained models.
- `train.py`: Training script for fine-tuning deepfake detection backbones (e.g., EfficientNet, CLIP, ResNet, Swin Transformer).
- `weights/`: Trained model checkpoint files (e.g. `.pt`, `.onnx`).
